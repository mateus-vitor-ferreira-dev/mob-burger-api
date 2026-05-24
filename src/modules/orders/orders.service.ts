import stripe from '../../config/stripe.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import { generateDailyOrderNumber } from '../../utils/orderNumber.js';
import { broadcastOrderUpdate } from './orders.sse.js';
import { sendWhatsApp, buildOrderReadyMessage, buildDriverAssignmentMessage } from '../notifications/whatsapp.service.js';
import { sendPushToCustomer, sendPushToAllStaff } from '../notifications/push.service.js';
import { validateCouponService } from '../coupons/coupons.service.js';
import { deductStockForOrder } from '../inventory/inventory.service.js';
import type { CreateOrderInput, UpdateStatusInput } from './orders.schema.js';

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
type DayKey = (typeof DAY_KEYS)[number];

function isWithinOpeningHours(
  openingHours: Record<DayKey, { open: string; close: string; closed: boolean }>,
): boolean {
  const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dayKey = DAY_KEYS[nowBR.getDay()];
  const hours = openingHours[dayKey];
  if (!hours || hours.closed) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const current = nowBR.getHours() * 60 + nowBR.getMinutes();
  const open = openH * 60 + openM;
  let close = closeH * 60 + closeM;
  if (close === 0) close = 24 * 60; // "00:00" = meia-noite, fim do expediente
  return current >= open && current < close;
}

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
  if (config) {
    if (!config.isOpen) {
      throw new AppError(MSG.order.storeClosed, HTTP.UNPROCESSABLE, 'STORE_CLOSED');
    }
    if (config.openingHours && !isWithinOpeningHours(config.openingHours as Record<DayKey, { open: string; close: string; closed: boolean }>)) {
      throw new AppError(MSG.order.storeClosed, HTTP.UNPROCESSABLE, 'STORE_CLOSED');
    }
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, inStock: true },
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

  // Apply coupon
  let discountAmount = 0;
  let couponId: string | undefined;
  if (data.couponCode) {
    const couponResult = await validateCouponService(data.couponCode, itemsTotal, deliveryFee, customerId);
    discountAmount = couponResult.discountAmount;
    couponId = couponResult.couponId;
    if (couponResult.type === 'FREE_DELIVERY') deliveryFee = 0;
  }

  const totalPrice = Number(Math.max(0, itemsTotal + deliveryFee - discountAmount).toFixed(2));
  const orderNumber = await generateDailyOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId,
      type: data.type,
      totalPrice,
      discountAmount,
      couponId,
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

  sendPushToAllStaff({
    title: '🍔 Novo pedido!',
    body: `Pedido #${String(order.orderNumber).padStart(4, '0')} — ${order.customer.name.split(' ')[0]}`,
    url: '/admin/pedidos',
  }).catch(() => {});

  return order;
}

export async function cancelOrderByCustomerService(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Pedido não encontrado.', HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (order.customerId !== customerId)
    throw new AppError('Acesso negado.', HTTP.FORBIDDEN, 'FORBIDDEN');
  if (!['AWAITING_PAYMENT', 'CONFIRMED'].includes(order.status))
    throw new AppError(
      'Pedido não pode mais ser cancelado.',
      HTTP.CONFLICT,
      'CANCEL_NOT_ALLOWED',
    );

  if (order.paymentStatus === 'PAID' && order.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    } catch {
      // Falha no reembolso não bloqueia o cancelamento
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
  });
  broadcastOrderUpdate({ type: 'status_update', order: updated });
  return updated;
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
        items: { include: { product: { select: { id: true, name: true, imageUrl: true, price: true } } } },
        delivery: true,
      },
    }),
    prisma.order.count({ where: { customerId } }),
  ]);
  return { orders, total, page, pages: Math.ceil(total / limit) };
}

export async function listOrdersService(status?: string, page = 1, limit = 50, from?: string, to?: string) {
  const where: Record<string, unknown> = status ? { status: status as never } : {};
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
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
  if (data.status === 'CANCELLED' && order.paymentStatus === 'PAID') {
    if (order.stripePaymentId) {
      await stripe.refunds.create({ payment_intent: order.stripePaymentId });
    }
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

  if (data.status === 'CONFIRMED') {
    deductStockForOrder(id).catch(() => {});
  }

  // Notifica cliente quando pedido fica pronto ou saiu para entrega
  if (data.status === 'READY' || data.status === 'OUT_FOR_DELIVERY') {
    const pushMessages: Record<string, { title: string; body: string }> = {
      READY: {
        title: '🍔 Seu pedido está pronto!',
        body: updated.type === 'PICKUP' ? 'Retire no balcão agora.' : 'Saindo para entrega em breve.',
      },
      OUT_FOR_DELIVERY: {
        title: '🛵 Pedido saiu para entrega!',
        body: `Pedido #${String(updated.orderNumber).padStart(4, '0')} a caminho.`,
      },
    };
    const push = pushMessages[data.status];
    if (push) {
      sendPushToCustomer(updated.customerId, { ...push, url: `/acompanhar/${updated.id}` }).catch(() => {});
    }
    if (updated.customer.phone) {
      const msg = buildOrderReadyMessage({
        customerName: updated.customer.name,
        orderNumber: updated.orderNumber,
        type: updated.type as 'DELIVERY' | 'PICKUP',
      });
      sendWhatsApp(updated.customer.phone, msg).catch(() => {});
    }
  }

  return updated;
}

export async function assignDriverService(orderId: string, driverId: string) {
  const [order, driver] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        delivery: true,
        items: { include: { product: true } },
      },
    }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);

  if (!order) throw new AppError('Pedido não encontrado.', HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (!driver) throw new AppError('Entregador não encontrado.', HTTP.NOT_FOUND, 'DRIVER_NOT_FOUND');
  if (order.type !== 'DELIVERY') throw new AppError('Apenas pedidos de entrega podem ser atribuídos.', HTTP.BAD_REQUEST, 'NOT_DELIVERY');
  if (!driver.active) throw new AppError('Entregador inativo.', HTTP.BAD_REQUEST, 'DRIVER_INACTIVE');

  const newStatus = order.status === 'READY' ? 'OUT_FOR_DELIVERY' : order.status;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { driverId, status: newStatus },
    include: { driver: true, delivery: true, customer: true },
  });

  broadcastOrderUpdate({ type: 'status_update', order: updated });

  if (order.delivery) {
    const msg = buildDriverAssignmentMessage({
      driverName: driver.name,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      address: {
        street: order.delivery.street,
        number: order.delivery.number,
        neighborhood: order.delivery.neighborhood,
        complement: order.delivery.complement,
      },
      items: order.items.map((i) => ({ quantity: i.quantity, productName: i.product.name })),
      totalPrice: order.totalPrice,
    });
    sendWhatsApp(driver.phone, msg).catch(() => {});
  }

  return updated;
}
