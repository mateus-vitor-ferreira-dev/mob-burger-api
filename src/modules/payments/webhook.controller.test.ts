import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../config/prisma.js', () => ({
  default: {
    order: { update: vi.fn() },
  },
}));

vi.mock('../../config/stripe.js', () => ({
  default: {
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock('../orders/orders.sse.js', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

import prisma from '../../config/prisma.js';
import stripe from '../../config/stripe.js';
import { broadcastOrderUpdate } from '../orders/orders.sse.js';
import { handleStripeWebhook } from './webhook.controller.js';

const mockRes = () => {
  const res = { json: vi.fn() } as unknown as Response;
  return res;
};

const makeReq = (sig: string | undefined, body: Buffer = Buffer.from('{}')) =>
  ({ headers: { 'stripe-signature': sig }, body }) as unknown as Request;

beforeEach(() => vi.clearAllMocks());

describe('handleStripeWebhook', () => {
  it('400 — sem stripe-signature no header', async () => {
    await expect(handleStripeWebhook(makeReq(undefined), mockRes())).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEBHOOK_INVALID',
    });
  });

  it('400 — constructEvent lança erro (assinatura inválida)', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('signature mismatch');
    });

    await expect(handleStripeWebhook(makeReq('bad_sig'), mockRes())).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEBHOOK_INVALID',
    });
  });

  it('200 — payment_intent.succeeded marca pedido como PAID e CONFIRMED', async () => {
    const mockOrder = { id: 'o1', status: 'CONFIRMED', paymentStatus: 'PAID' };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { orderId: 'o1' } } },
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue(mockOrder as any);

    const res = mockRes();
    await handleStripeWebhook(makeReq('valid_sig'), res);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      }),
    );
    expect(broadcastOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new_order' }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('200 — payment_intent.succeeded sem orderId não atualiza banco', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { metadata: {} } },
    } as any);

    const res = mockRes();
    await handleStripeWebhook(makeReq('valid_sig'), res);

    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('200 — payment_intent.payment_failed marca paymentStatus como FAILED', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { metadata: { orderId: 'o1' } } },
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);

    const res = mockRes();
    await handleStripeWebhook(makeReq('valid_sig'), res);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: { paymentStatus: 'FAILED' },
      }),
    );
    expect(broadcastOrderUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('200 — evento desconhecido retorna received sem erros', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.created',
      data: { object: {} },
    } as any);

    const res = mockRes();
    await handleStripeWebhook(makeReq('valid_sig'), res);

    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
