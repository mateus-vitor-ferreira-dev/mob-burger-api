import type { Request, Response } from 'express';
import stripe from '../../config/stripe.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';
import { broadcastOrderUpdate } from '../orders/orders.sse.js';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(MSG.payment.webhookInvalid, HTTP.BAD_REQUEST, 'WEBHOOK_INVALID');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError(MSG.payment.webhookInvalid, HTTP.BAD_REQUEST, 'WEBHOOK_INVALID');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const orderId = intent.metadata?.orderId;

    if (orderId) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        include: { customer: true, items: { include: { product: true } }, delivery: true },
      });

      broadcastOrderUpdate({ type: 'new_order', order: updated });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const orderId = intent.metadata?.orderId;

    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
      });
    }
  }

  return res.json({ received: true });
}
