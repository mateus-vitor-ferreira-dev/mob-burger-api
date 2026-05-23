import stripe from '../../config/stripe.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import { generateDailyOrderNumber } from '../../utils/orderNumber.js';
import { broadcastOrderUpdate } from './orders.sse.js';
import { sendWhatsApp, buildOrderReadyMessage } from '../notifications/whatsapp.service.js';
import type { CreateOrderInput, UpdateStatusInput } from './orders.schema.js';

// Transições de status permitidas pelo operador
const VALID_TRANSITIONS: Record<string, string[]> = {
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'PICKED_UP', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  PICKED_UP: [],
  CANCELLED: [],
};

export async function createOrderService(customerId: string, data: CreateOrderInput) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'CUSTOMER_NOT_FOUND');

  if (!customer.phone) {
    throw new AppError(MSG.customer.phoneRequired, HTTP.UNPROCESSABLE, 'PHONE_REQUIRED');
  }

  const config = await prisma.storeConfig.findFirst();
  if (config && !config.isOpen) {
    throw new AppError(MSG.order.storeClosed, HTTP.UNPROCESSABLE, 'STORE_CLOSED');
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  if (products.length !== new Set(productIds).size) {
    throw new AppError(MSG.menu.productUnavailable, HTTP.BAD_REQUEST, 'PRODUCT_UNAVAILABLE');
  }

  // Busca todos os optionItems para calcular adicionais
  const optionItemIds = data.items.flatMap((i) => i.options.map((o) => o.optionItemId));
  const optionItems = optionItemIds.length
    ? await prisma.optionItem.findMany({ where: { id: { in: optionItemIds } } })
    : [];

  const itemsTotal = data.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const optionsTotal = item.options.reduce((oSum, opt) => {
      const oi = optionItems.find((x) => x.id === opt.optionItemId);
      return oSum + (oi?.additionalPrice ?? 0);
    }, 0);
    return sum + (product.price + optionsTotal) * item.quantity;
  }, 0);

  let deliveryFee = 0;
  if (data.type === 'DELIVERY' && data.delivery?.zoneId) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: data.delivery.zoneId } });
    deliveryFee = zone?.fee ?? 0;
  }

  const totalPrice = Number((itemsTotal + deliveryFee).toFixed(2));
  const orderNumber = await generateDailyOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId,
      type: data.type,
      totalPrice,
      paymentMethod: data.paymentMethod,
      items: {
        create: data.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            observations: item.observations,
            options: {
              create: item.options.map((o) => ({ optionItemId: o.optionItemId })),
            },
          };
        }),
      },
      ...(data.type === 'DELIVERY' && data.delivery
        ? {
            delivery: {
              create: {
                customerId,
                street: data.delivery.street,
                number: data.delivery.number,
                neighborhood: data.delivery.neighborhood,
                complement: data.delivery.complement,
                zoneId: data.delivery.zoneId,
              },
            },
          }
        : {}),
    },
    include: {
      items: { include: { product: true, options: { include: { optionItem: true } } } },
      delivery: { include: { zone: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  broadcastOrderUpdate({ type: 'new_order', order });

  return order;
}

export async function getOrderService(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, options: { include: { optionItem: true } } } },
      delivery: { include: { zone: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  return order;
}

export async function myOrdersService(customerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        delivery: true,
      },
    }),
    prisma.order.count({ where: { customerId } }),
  ]);
  return { orders, total, page, pages: Math.ceil(total / limit) };
}

export async function listOrdersService(status?: string, page = 1, limit = 50) {
  const where = status ? { status: status as never } : {};
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: { include: { product: true } },
        delivery: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page, pages: Math.ceil(total / limit) };
}

export async function updateOrderStatusService(id: string, data: UpdateStatusInput) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(data.status)) {
    throw new AppError(MSG.order.invalidStatus, HTTP.UNPROCESSABLE, 'INVALID_STATUS_TRANSITION');
  }

  const updateData: Record<string, unknown> = { status: data.status };

  // Reembolso automático ao cancelar pedido já pago
  if (data.status === 'CANCELLED' && order.paymentStatus === 'PAID' && order.stripePaymentId) {
    await stripe.refunds.create({ payment_intent: order.stripePaymentId });
    updateData.paymentStatus = 'REFUNDED';
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      items: { include: { product: true } },
      delivery: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  broadcastOrderUpdate({ type: 'status_update', order: updated });

  // Notifica cliente quando pedido fica pronto ou saiu para entrega
  if ((data.status === 'READY' || data.status === 'OUT_FOR_DELIVERY') && updated.customer.phone) {
    const msg = buildOrderReadyMessage({
      customerName: updated.customer.name,
      orderNumber: updated.orderNumber,
      type: updated.type as 'DELIVERY' | 'PICKUP',
    });
    sendWhatsApp(updated.customer.phone, msg).catch(() => {});
  }

  return updated;
}
