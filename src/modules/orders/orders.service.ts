import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import { generateDailyOrderNumber } from '../../utils/orderNumber.js';
import { broadcastOrderUpdate } from './orders.sse.js';
import type { CreateOrderInput, UpdateStatusInput } from './orders.schema.js';

export async function createOrderService(data: CreateOrderInput) {
  const config = await prisma.storeConfig.findFirst();
  if (config && !config.isOpen) {
    throw new AppError(MSG.order.storeClosed, HTTP.UNPROCESSABLE, 'STORE_CLOSED');
  }

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) }, active: true },
  });

  if (products.length !== data.items.length) {
    throw new AppError(MSG.menu.productUnavailable, HTTP.BAD_REQUEST, 'PRODUCT_UNAVAILABLE');
  }

  const itemsTotal = data.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);

  let deliveryFee = 0;
  if (data.type === 'DELIVERY' && data.delivery?.zoneId) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: data.delivery.zoneId } });
    deliveryFee = zone?.fee ?? 0;
  }

  const totalPrice = itemsTotal + deliveryFee;
  const orderNumber = await generateDailyOrderNumber();

  let customer = await prisma.customer.findFirst({ where: { phone: data.customer.phone } });
  if (!customer) {
    customer = await prisma.customer.create({ data: data.customer });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
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
                customerId: customer.id,
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
      customer: true,
    },
  });

  return order;
}

export async function getOrderService(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, options: { include: { optionItem: true } } } },
      delivery: { include: { zone: true } },
      customer: true,
    },
  });

  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  return order;
}

export async function listOrdersService(status?: string) {
  return prisma.order.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: true } },
      delivery: true,
      customer: true,
    },
  });
}

export async function updateOrderStatusService(id: string, data: UpdateStatusInput) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');

  const updated = await prisma.order.update({
    where: { id },
    data: { status: data.status },
    include: {
      items: { include: { product: true } },
      delivery: true,
      customer: true,
    },
  });

  broadcastOrderUpdate({ type: 'status_update', order: updated });

  return updated;
}
