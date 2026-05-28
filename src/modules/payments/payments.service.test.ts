import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    customer: { findUnique: vi.fn() },
  },
}));

vi.mock('../../config/pagarme.js', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../notifications/whatsapp.service.js', () => ({
  sendWhatsApp: vi.fn(),
  buildOrderConfirmedMessage: vi.fn(() => 'msg'),
}));

vi.mock('../orders/orders.sse.js', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

import prisma from '../../config/prisma.js';
import pagarme from '../../config/pagarme.js';
import { createPaymentIntentService } from './payments.service.js';

const baseCustomer = { id: 'c1', name: 'Test', email: 'test@test.com', phone: '35999999999' };
const baseItem = { id: 'item1', unitPrice: 29.9, quantity: 1, product: { name: 'Mob Bacon' } };
const baseOrder = {
  id: 'o1',
  customerId: 'c1',
  totalPrice: 29.9,
  paymentStatus: 'PENDING',
  status: 'AWAITING_PAYMENT',
  orderNumber: 1,
  items: [baseItem],
};

beforeEach(() => vi.clearAllMocks());

describe('createPaymentIntentService', () => {
  it('confirma CASH_ON_DELIVERY sem chamar Pagar.me', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'CASH_ON_DELIVERY' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, customer: baseCustomer, items: [baseItem] } as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(pagarme.post).not.toHaveBeenCalled();
    expect(result).toMatchObject({ method: 'CASH_ON_DELIVERY' });
  });

  it('confirma CARD_ON_DELIVERY sem chamar Pagar.me', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'CARD_ON_DELIVERY' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, customer: baseCustomer, items: [baseItem] } as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(pagarme.post).not.toHaveBeenCalled();
    expect(result).toMatchObject({ method: 'CARD_ON_DELIVERY' });
  });

  it('cria pedido PIX no Pagar.me e retorna dados do QR Code', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'PIX' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(pagarme.post).mockResolvedValue({
      data: {
        id: 'or_test',
        status: 'pending',
        charges: [{ last_transaction: { qr_code: '00020126...', qr_code_url: 'https://api.pagar.me/qr.png', expires_at: '2026-05-28T10:00:00Z' } }],
      },
    } as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(pagarme.post).toHaveBeenCalledWith('/orders', expect.objectContaining({
      payments: [expect.objectContaining({ payment_method: 'pix' })],
    }));
    expect(result).toMatchObject({ method: 'PIX', qrCode: '00020126...' });
    expect(typeof (result as any).expiresAt).toBe('number');
  });

  it('cria pedido CARD no Pagar.me com cardToken e retorna status paid', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'CARD' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, customer: baseCustomer, items: [baseItem] } as any);
    vi.mocked(pagarme.post).mockResolvedValue({ data: { id: 'or_test', status: 'paid', charges: [] } } as any);

    const result = await createPaymentIntentService('c1', 'o1', 'token_xxx');

    expect(pagarme.post).toHaveBeenCalledWith('/orders', expect.objectContaining({
      payments: [expect.objectContaining({ payment_method: 'credit_card' })],
    }));
    expect(result).toMatchObject({ method: 'CARD', status: 'paid' });
  });

  it('lança CARD_TOKEN_REQUIRED quando cartão não tem token', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'CARD' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);

    await expect(createPaymentIntentService('c1', 'o1')).rejects.toMatchObject({
      code: 'CARD_TOKEN_REQUIRED',
    });
  });

  it('lança PAYMENT_DECLINED quando Pagar.me recusa cartão', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'CARD' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(pagarme.post).mockResolvedValue({
      data: {
        id: 'or_test',
        status: 'failed',
        charges: [{ last_transaction: { acquirer_message: 'Insufficient funds' } }],
      },
    } as any);

    await expect(createPaymentIntentService('c1', 'o1', 'token_xxx')).rejects.toMatchObject({
      code: 'PAYMENT_DECLINED',
    });
  });

  it('lança 404 quando pedido não existe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);

    await expect(createPaymentIntentService('c1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORDER_NOT_FOUND',
    });
  });

  it('lança 403 quando cliente não é dono do pedido', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, customerId: 'outro' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);

    await expect(createPaymentIntentService('c1', 'o1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('lança 409 quando pedido já foi pago', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentStatus: 'PAID' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);

    await expect(createPaymentIntentService('c1', 'o1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_PAID',
    });
  });

  it('converte unitPrice em centavos corretamente (R$29,90 → 2990)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...baseOrder, paymentMethod: 'PIX' } as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(baseCustomer as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(pagarme.post).mockResolvedValue({
      data: { id: 'or_test', charges: [{ last_transaction: {} }] },
    } as any);

    await createPaymentIntentService('c1', 'o1');

    expect(pagarme.post).toHaveBeenCalledWith('/orders', expect.objectContaining({
      items: expect.arrayContaining([expect.objectContaining({ amount: 2990 })]),
    }));
  });
});
