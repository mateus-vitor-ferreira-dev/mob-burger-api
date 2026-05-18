import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    order: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../config/stripe.js', () => ({
  default: {
    paymentIntents: { create: vi.fn() },
  },
}));

import prisma from '../../config/prisma.js';
import stripe from '../../config/stripe.js';
import { createPaymentIntentService } from './payments.service.js';

const baseOrder = {
  id: 'o1',
  customerId: 'c1',
  totalPrice: 29.9,
  paymentStatus: 'PENDING',
  status: 'AWAITING_PAYMENT',
};

beforeEach(() => vi.clearAllMocks());

describe('createPaymentIntentService', () => {
  it('confirma pedido CASH_ON_DELIVERY sem chamar Stripe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentMethod: 'CASH_ON_DELIVERY',
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONFIRMED' } }),
    );
    expect(result).toMatchObject({ method: 'CASH_ON_DELIVERY' });
  });

  it('confirma pedido CARD_ON_DELIVERY sem chamar Stripe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentMethod: 'CARD_ON_DELIVERY',
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ method: 'CARD_ON_DELIVERY' });
  });

  it('cria PaymentIntent PIX e retorna dados do QR Code', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentMethod: 'PIX',
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_test',
      client_secret: 'pi_test_secret',
      next_action: {
        pix_display_qr_code: {
          data: '00020126...',
          image_url_png: 'https://qr.stripe.com/test.png',
          expires_at: 1716069600,
        },
      },
    } as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'brl', payment_method_types: ['pix'] }),
    );
    expect(result).toMatchObject({
      method: 'PIX',
      clientSecret: 'pi_test_secret',
      qrCode: '00020126...',
    });
  });

  it('cria PaymentIntent CARD e retorna clientSecret', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentMethod: 'CARD',
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_test',
      client_secret: 'pi_test_secret',
    } as any);

    const result = await createPaymentIntentService('c1', 'o1');

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method_types: ['card'] }),
    );
    expect(result).toMatchObject({ method: 'CARD', clientSecret: 'pi_test_secret' });
  });

  it('lança 404 quando pedido não existe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    await expect(createPaymentIntentService('c1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ORDER_NOT_FOUND',
    });
  });

  it('lança 403 quando cliente não é dono do pedido', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      customerId: 'outro_cliente',
    } as any);

    await expect(createPaymentIntentService('c1', 'o1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('lança 409 quando pedido já foi pago', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentStatus: 'PAID',
    } as any);

    await expect(createPaymentIntentService('c1', 'o1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_PAID',
    });
  });

  it('calcula amount em centavos corretamente (R$29,90 → 2990)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...baseOrder,
      paymentMethod: 'CARD',
      totalPrice: 29.9,
    } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({} as any);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi',
      client_secret: 's',
    } as any);

    await createPaymentIntentService('c1', 'o1');

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2990 }),
    );
  });
});
