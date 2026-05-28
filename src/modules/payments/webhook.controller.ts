import crypto from 'crypto';
import type { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';
import { broadcastOrderUpdate } from '../orders/orders.sse.js';
import { sendWhatsApp, buildOrderConfirmedMessage } from '../notifications/whatsapp.service.js';

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.PAGARME_WEBHOOK_SECRET ?? '';
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function handlePagarmeWebhook(req: Request, res: Response) {
  const signature = req.headers['x-hub-signature'] as string | undefined;

  if (!signature || !process.env.PAGARME_WEBHOOK_SECRET) {
    throw new AppError(MSG.payment.webhookInvalid, HTTP.BAD_REQUEST, 'WEBHOOK_INVALID');
  }

  if (!verifySignature(req.body as Buffer, signature)) {
    throw new AppError(MSG.payment.webhookInvalid, HTTP.BAD_REQUEST, 'WEBHOOK_INVALID');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = JSON.parse((req.body as Buffer).toString()) as { type: string; data: any };

  if (event.type === 'order.paid' || event.type === 'charge.paid') {
    // Pagar.me envia o orderId no campo `code` que definimos na criação
    const orderId: string | undefined =
      event.data?.code ?? event.data?.order?.code;

    if (orderId) {
      const existing = await prisma.order.findUnique({
        where: { id: orderId },
        select: { paymentStatus: true },
      });

      // Evita reprocessar se já confirmado (cartão confirma sincronamente)
      if (existing && existing.paymentStatus !== 'PAID') {
        const updated = await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            items: { include: { product: true } },
            delivery: true,
          },
        });

        broadcastOrderUpdate({ type: 'new_order', order: updated });

        if (updated.customer.phone) {
          const msg = buildOrderConfirmedMessage({
            customerName: updated.customer.name,
            orderNumber: updated.orderNumber,
            orderId: updated.id,
            items: updated.items.map((i) => ({ quantity: i.quantity, productName: i.product.name })),
            totalPrice: updated.totalPrice,
          });
          sendWhatsApp(updated.customer.phone, msg).catch(() => {});
        }
      }
    }
  }

  if (event.type === 'charge.payment_failed') {
    const orderId: string | undefined = event.data?.order?.code;
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  }

  return res.json({ received: true });
}
