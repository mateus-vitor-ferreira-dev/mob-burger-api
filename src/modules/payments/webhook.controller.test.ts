import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import crypto from 'crypto';

vi.mock('../../config/prisma.js', () => ({
  default: {
    order: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../orders/orders.sse.js', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

vi.mock('../notifications/whatsapp.service.js', () => ({
  sendWhatsApp: vi.fn(),
  buildOrderConfirmedMessage: vi.fn(() => 'msg'),
}));

import prisma from '../../config/prisma.js';
import { broadcastOrderUpdate } from '../orders/orders.sse.js';
import { handlePagarmeWebhook } from './webhook.controller.js';

const WEBHOOK_SECRET = 'test_secret';

function makeSignature(body: Buffer): string {
  return 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

const mockRes = () => ({ json: vi.fn() } as unknown as Response);

function makeReq(body: object, sig?: string): Request {
  const buf = Buffer.from(JSON.stringify(body));
  return {
    headers: { 'x-hub-signature': sig ?? makeSignature(buf) },
    body: buf,
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PAGARME_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

describe('handlePagarmeWebhook', () => {
  it('400 — sem x-hub-signature', async () => {
    const req = makeReq({}, undefined);
    (req.headers as any)['x-hub-signature'] = undefined;

    await expect(handlePagarmeWebhook(req, mockRes())).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEBHOOK_INVALID',
    });
  });

  it('400 — assinatura inválida', async () => {
    const req = makeReq({ type: 'order.paid' }, 'sha256=invalida');

    await expect(handlePagarmeWebhook(req, mockRes())).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEBHOOK_INVALID',
    });
  });

  it('order.paid — marca pedido como PAID e CONFIRMED quando ainda pendente', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ paymentStatus: 'PENDING' } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'o1', orderNumber: 1, totalPrice: 29.9,
      customer: { name: 'Test', phone: '35999' },
      items: [{ quantity: 1, product: { name: 'Mob Bacon' } }],
    } as any);

    const body = { type: 'order.paid', data: { code: 'o1' } };
    const res = mockRes();
    await handlePagarmeWebhook(makeReq(body), res);

    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'o1' },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    }));
    expect(broadcastOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_order' }));
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('order.paid — não reprocessa pedido já pago', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ paymentStatus: 'PAID' } as any);

    const body = { type: 'order.paid', data: { code: 'o1' } };
    const res = mockRes();
    await handlePagarmeWebhook(makeReq(body), res);

    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('charge.paid — usa order.code como orderId', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ paymentStatus: 'PENDING' } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'o1', orderNumber: 1, totalPrice: 29.9,
      customer: { name: 'Test', phone: null },
      items: [],
    } as any);

    const body = { type: 'charge.paid', data: { order: { code: 'o1' } } };
    await handlePagarmeWebhook(makeReq(body), mockRes());

    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'o1' } }));
  });

  it('charge.payment_failed — marca paymentStatus como FAILED', async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);

    const body = { type: 'charge.payment_failed', data: { order: { code: 'o1' } } };
    const res = mockRes();
    await handlePagarmeWebhook(makeReq(body), res);

    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'o1' },
      data: { paymentStatus: 'FAILED' },
    }));
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('evento desconhecido retorna received sem erros', async () => {
    const body = { type: 'customer.created', data: {} };
    const res = mockRes();
    await handlePagarmeWebhook(makeReq(body), res);

    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
