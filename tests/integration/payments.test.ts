import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { customerToken, adminToken, createCategory, createProduct, createCustomer, prisma } from '../helpers.js';

// Stripe é mockado para evitar chamadas reais em testes
vi.mock('../../src/config/stripe.js', () => ({
  default: {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_secret',
        next_action: null,
      }),
    },
    webhooks: {
      // Por padrão lança erro — simula assinatura inválida
      constructEvent: vi.fn().mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      }),
    },
  },
}));

async function createOrderViaApi(customerAccessToken: string, productId: string, paymentMethod = 'CASH_ON_DELIVERY') {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerAccessToken}`)
    .send({
      type: 'PICKUP',
      paymentMethod,
      items: [{ productId, quantity: 1, options: [] }],
    });
  return res.body.data;
}

describe('POST /api/payments/intent', () => {
  it('200 — CASH_ON_DELIVERY confirma pedido sem Stripe', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id);
    const token = await customerToken();
    const order = await createOrderViaApi(token, prod.id, 'CASH_ON_DELIVERY');

    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id });

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('CASH_ON_DELIVERY');
    expect(res.body.data).toHaveProperty('message');

    // Verifica que status foi atualizado para CONFIRMED
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('CONFIRMED');
  });

  it('200 — CARD retorna clientSecret', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id);
    const token = await customerToken();
    const order = await createOrderViaApi(token, prod.id, 'CARD');

    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id });

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('CARD');
    expect(res.body.data).toHaveProperty('clientSecret');
  });

  it('401 — sem autenticação', async () => {
    const res = await request(app)
      .post('/api/payments/intent')
      .send({ orderId: 'qualquer' });

    expect(res.status).toBe(401);
  });

  it('403 — cliente não pode pagar pedido de outro cliente', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id);

    const token1 = await customerToken('c1@test.com');
    const token2 = await customerToken('c2@test.com');
    const order = await createOrderViaApi(token1, prod.id);

    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${token2}`)
      .send({ orderId: order.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('404 — pedido não encontrado', async () => {
    const token = await customerToken();

    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: 'cmaaaaaaaa0000d0aaaaaaaaaa' });

    expect(res.status).toBe(404);
  });

  it('409 — pedido já pago', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id);
    const token = await customerToken();
    const order = await createOrderViaApi(token, prod.id);

    // Marca como pago diretamente no banco
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID' },
    });

    const res = await request(app)
      .post('/api/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PAID');
  });
});

describe('POST /api/payments/webhook', () => {
  it('400 — assinatura inválida', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'assinatura_invalida')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEBHOOK_INVALID');
  });
});
