import stripe from '../../config/stripe.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';

export async function createPaymentIntentService(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(MSG.order.notFound, HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (order.paymentStatus === 'PAID') throw new AppError(MSG.payment.alreadyPaid, HTTP.CONFLICT, 'ALREADY_PAID');

  const amount = Math.round(order.totalPrice * 100);

  if (order.paymentMethod === 'PIX') {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      payment_method_types: ['pix'],
      metadata: { orderId },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: intent.id },
    });

    return {
      method: 'PIX',
      qrCode: intent.next_action?.pix_display_qr_code?.data ?? null,
      qrCodeImage: intent.next_action?.pix_display_qr_code?.image_url_png ?? null,
      expiresAt: intent.next_action?.pix_display_qr_code?.expires_at ?? null,
    };
  }

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
