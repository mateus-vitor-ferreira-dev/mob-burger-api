import pagarme from '../../config/pagarme.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import { sendWhatsApp, buildOrderConfirmedMessage } from '../notifications/whatsapp.service.js';
import { broadcastOrderUpdate } from '../orders/orders.sse.js';

function buildCustomerPayload(customer: { name: string; email: string; phone: string | null }) {
  const digits = (customer.phone ?? '').replace(/\D/g, '');
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  return {
    name: customer.name,
    email: customer.email,
    // TODO: coletar CPF do cliente — obrigatório para produção com PIX
    document: '00000000000',
    document_type: 'CPF',
    phones: {
      mobile_phone: {
        country_code: '55',
        area_code: withoutCountry.slice(0, 2) || '11',
        number: withoutCountry.slice(2) || '999999999',
      },
    },
  };
}

async function confirmOrderAndNotify(orderId: string) {
  const confirmed = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { include: { product: true } },
    },
  });

  broadcastOrderUpdate({ type: 'new_order', order: confirmed });

  if (confirmed.customer.phone) {
    const msg = buildOrderConfirmedMessage({
      customerName: confirmed.customer.name,
      orderNumber: confirmed.orderNumber,
      orderId: confirmed.id,
      items: confirmed.items.map((i) => ({ quantity: i.quantity, productName: i.product.name })),
      totalPrice: confirmed.totalPrice,
    });
    sendWhatsApp(confirmed.customer.phone, msg).catch(() => {});
  }
}

export async function createPaymentIntentService(
  customerId: string,
  orderId: string,
  cardToken?: string,
) {
  const [order, customer] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    }),
    prisma.customer.findUnique({ where: { id: customerId } }),
  ]);

  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (order.customerId !== customerId)
    throw new AppError(MSG.auth.forbidden, HTTP.FORBIDDEN, 'FORBIDDEN');
  if (order.paymentStatus === 'PAID')
    throw new AppError(MSG.payment.alreadyPaid, HTTP.CONFLICT, 'ALREADY_PAID');
  if (!customer) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'CUSTOMER_NOT_FOUND');

  // Pagamento na entrega — sem gateway
  if (order.paymentMethod === 'CASH_ON_DELIVERY' || order.paymentMethod === 'CARD_ON_DELIVERY') {
    const confirmed = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true } },
      },
    });

    broadcastOrderUpdate({ type: 'new_order', order: confirmed });

    if (confirmed.customer.phone) {
      const msg = buildOrderConfirmedMessage({
        customerName: confirmed.customer.name,
        orderNumber: confirmed.orderNumber,
        orderId: confirmed.id,
        items: confirmed.items.map((i) => ({ quantity: i.quantity, productName: i.product.name })),
        totalPrice: confirmed.totalPrice,
      });
      sendWhatsApp(confirmed.customer.phone, msg).catch(() => {});
    }

    return {
      method: order.paymentMethod,
      message: 'Pedido confirmado. Pagamento será realizado na entrega.',
    };
  }

  const pagarmeCustomer = buildCustomerPayload(customer);
  const pagarmeItems = order.items.map((item) => ({
    amount: Math.round(item.unitPrice * 100),
    description: item.product.name,
    quantity: item.quantity,
    code: item.id,
  }));

  // PIX
  if (order.paymentMethod === 'PIX') {
    const { data: pagarmeOrder } = await pagarme.post('/orders', {
      code: orderId,
      items: pagarmeItems,
      customer: pagarmeCustomer,
      payments: [{ payment_method: 'pix', pix: { expires_in: 3600 } }],
    });

    const transaction = pagarmeOrder.charges?.[0]?.last_transaction;

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentGatewayId: pagarmeOrder.id },
    });

    return {
      method: 'PIX',
      qrCode: transaction?.qr_code ?? null,
      qrCodeImage: transaction?.qr_code_url ?? null,
      expiresAt: transaction?.expires_at
        ? Math.floor(new Date(transaction.expires_at).getTime() / 1000)
        : null,
    };
  }

  // Cartão de crédito
  if (!cardToken) {
    throw new AppError('Token do cartão obrigatório', HTTP.BAD_REQUEST, 'CARD_TOKEN_REQUIRED');
  }

  const { data: pagarmeOrder } = await pagarme.post('/orders', {
    code: orderId,
    items: pagarmeItems,
    customer: pagarmeCustomer,
    payments: [{
      payment_method: 'credit_card',
      credit_card: {
        installments: 1,
        statement_descriptor: 'MOB BURGER',
        card_token: cardToken,
      },
    }],
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentGatewayId: pagarmeOrder.id },
  });

  if (pagarmeOrder.status !== 'paid') {
    const decline =
      pagarmeOrder.charges?.[0]?.last_transaction?.acquirer_message ?? 'Pagamento recusado pelo banco.';
    throw new AppError(decline, HTTP.UNPROCESSABLE, 'PAYMENT_DECLINED');
  }

  // Confirma imediatamente; webhook também confirma como fallback
  await confirmOrderAndNotify(orderId);

  return { method: 'CARD', status: 'paid' };
}
