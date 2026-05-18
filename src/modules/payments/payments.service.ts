import stripe from '../../config/stripe.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';

export async function createPaymentIntentService(customerId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (order.customerId !== customerId) throw new AppError(MSG.auth.forbidden, HTTP.FORBIDDEN, 'FORBIDDEN');
  if (order.paymentStatus === 'PAID') throw new AppError(MSG.payment.alreadyPaid, HTTP.CONFLICT, 'ALREADY_PAID');

  const amount = Math.round(order.totalPrice * 100);

  // Pagamento na entrega — não precisa de Stripe
  if (order.paymentMethod === 'CASH_ON_DELIVERY' || order.paymentMethod === 'CARD_ON_DELIVERY') {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });
    return {
      method: order.paymentMethod,
      message: 'Pedido confirmado. Pagamento será realizado na entrega.',
    };
  }

  // PIX — cria e confirma em uma chamada para obter o QR Code
  if (order.paymentMethod === 'PIX') {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      payment_method_types: ['pix'],
      payment_method_data: { type: 'pix' },
      confirm: true,
      return_url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/orders/${orderId}`,
      metadata: { orderId },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: intent.id },
    });

    const qr = (intent as any).next_action?.pix_display_qr_code;

    return {
      method: 'PIX',
      clientSecret: intent.client_secret,
      qrCode: qr?.data ?? null,
      qrCodeImage: qr?.image_url_png ?? null,
      expiresAt: qr?.expires_at ?? null,
    };
  }

  // Cartão — retorna clientSecret para o Stripe Elements no frontend confirmar
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: 'brl',
    payment_method_types: ['card'],
    metadata: { orderId },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { stripePaymentId: intent.id },
  });

  return { method: 'CARD', clientSecret: intent.client_secret };
}
