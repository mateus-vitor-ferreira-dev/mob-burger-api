import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { adminToken, customerToken, createCategory, createProduct, createCustomer, prisma } from '../helpers.js';

async function setupOrderData() {
  const cat = await createCategory();
  const prod = await createProduct(cat.id);
  return { cat, prod };
}

describe('POST /api/orders', () => {
  it('201 — cliente autenticado cria pedido pickup', async () => {
    const { prod } = await setupOrderData();
    const token = await customerToken();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'PICKUP',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: prod.id, quantity: 1, options: [] }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('PICKUP');
    expect(res.body.data.orderNumber).toBe(1);
    expect(res.body.data.totalPrice).toBe(29.9);
  });

  it('401 — sem autenticação', async () => {
    const { prod } = await setupOrderData();

    const res = await request(app)
      .post('/api/orders')
      .send({
        type: 'PICKUP',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: prod.id, quantity: 1, options: [] }],
      });

    expect(res.status).toBe(401);
  });

  it('403 — staff não pode criar pedido como cliente', async () => {
    const { prod } = await setupOrderData();
    const token = await adminToken();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'PICKUP',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: prod.id, quantity: 1, options: [] }],
      });

    expect(res.status).toBe(403);
  });

  it('422 — loja fechada', async () => {
    await prisma.storeConfig.create({
      data: { isOpen: false, openingHours: {} },
    });
    const { prod } = await setupOrderData();
    const token = await customerToken();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'PICKUP',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: prod.id, quantity: 1, options: [] }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STORE_CLOSED');
  });

  it('400 — produto inexistente no pedido', async () => {
    const token = await customerToken();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'PICKUP',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: 'id_invalido_cuid1234567', quantity: 1, options: [] }],
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders/:id (tracking público)', () => {
  it('200 — qualquer pessoa pode ver o pedido pelo ID', async () => {
    const { prod } = await setupOrderData();
    const token = await customerToken();

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'PICKUP', paymentMethod: 'CASH_ON_DELIVERY', items: [{ productId: prod.id, quantity: 1, options: [] }] });

    const res = await request(app).get(`/api/orders/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it('404 — pedido não encontrado', async () => {
    const res = await request(app).get('/api/orders/id_que_nao_existe');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/orders/my', () => {
  it('200 — cliente vê seus próprios pedidos', async () => {
    const { prod } = await setupOrderData();
    const token = await customerToken();

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'PICKUP', paymentMethod: 'CASH_ON_DELIVERY', items: [{ productId: prod.id, quantity: 1, options: [] }] });

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('401 — sem token', async () => {
    const res = await request(app).get('/api/orders/my');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders (operador)', () => {
  it('200 — staff lista todos os pedidos', async () => {
    const token = await adminToken();
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 — cliente não pode listar todos os pedidos', async () => {
    const token = await customerToken();
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('200 — filtra por status', async () => {
    const token = await adminToken();
    const res = await request(app)
      .get('/api/orders?status=CONFIRMED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('200 — staff avança status em transição válida', async () => {
    const { prod } = await setupOrderData();
    const cToken = await customerToken();
    const aToken = await adminToken();

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${cToken}`)
      .send({ type: 'PICKUP', paymentMethod: 'CASH_ON_DELIVERY', items: [{ productId: prod.id, quantity: 1, options: [] }] });

    // AWAITING_PAYMENT → CONFIRMED
    const res = await request(app)
      .patch(`/api/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('422 — transição inválida é bloqueada', async () => {
    const { prod } = await setupOrderData();
    const cToken = await customerToken();
    const aToken = await adminToken();

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${cToken}`)
      .send({ type: 'PICKUP', paymentMethod: 'CASH_ON_DELIVERY', items: [{ productId: prod.id, quantity: 1, options: [] }] });

    // AWAITING_PAYMENT → DELIVERED (inválido)
    const res = await request(app)
      .patch(`/api/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
