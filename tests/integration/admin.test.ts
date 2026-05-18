import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { adminToken, createCategory, createProduct, prisma } from '../helpers.js';

describe('GET /api/admin/categories', () => {
  it('200 — admin lista todas as categorias (incluindo inativas)', async () => {
    const token = await adminToken();
    await createCategory({ name: 'Ativa', slug: 'ativa' });
    await prisma.category.create({
      data: { name: 'Inativa', slug: 'inativa', position: 2, active: false },
    });

    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('401 — sem token', async () => {
    const res = await request(app).get('/api/admin/categories');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/products', () => {
  it('200 — lista todos os produtos (incluindo inativos)', async () => {
    const token = await adminToken();
    const cat = await createCategory();
    await createProduct(cat.id, { active: true });
    await createProduct(cat.id, { name: 'Inativo', active: false });

    const res = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty('category');
  });
});

describe('POST /api/admin/products', () => {
  it('201 — cria produto', async () => {
    const token = await adminToken();
    const cat = await createCategory();

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: cat.id, name: 'Mob Smash', price: 32.9 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Mob Smash');
  });

  it('400 — campos inválidos', async () => {
    const token = await adminToken();

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sem categoria e sem preço' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/products/:productId/options', () => {
  it('201 — cria grupo de opções para um produto', async () => {
    const token = await adminToken();
    const cat = await createCategory();
    const prod = await createProduct(cat.id);

    const res = await request(app)
      .post(`/api/admin/products/${prod.id}/options`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Ponto da carne', type: 'RADIO', required: true });

    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe('Ponto da carne');
    expect(res.body.data.type).toBe('RADIO');
  });

  it('404 — produto não existe', async () => {
    const token = await adminToken();

    const res = await request(app)
      .post('/api/admin/products/id_inexistente_qualquer/options')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Ponto da carne', type: 'RADIO', required: false });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/products/:productId/options/:optionId/items', () => {
  it('201 — adiciona item a uma opção', async () => {
    const token = await adminToken();
    const cat = await createCategory();
    const prod = await createProduct(cat.id);
    const optRes = await request(app)
      .post(`/api/admin/products/${prod.id}/options`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Ponto', type: 'RADIO', required: true });

    const optionId = optRes.body.data.id;

    const res = await request(app)
      .post(`/api/admin/products/${prod.id}/options/${optionId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ao ponto', additionalPrice: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Ao ponto');
  });
});

describe('GET /api/admin/delivery-zones', () => {
  it('200 — lista zonas de entrega', async () => {
    const token = await adminToken();
    await prisma.deliveryZone.createMany({
      data: [
        { name: 'Centro', fee: 5.0 },
        { name: 'Jardim', fee: 8.0 },
      ],
    });

    const res = await request(app)
      .get('/api/admin/delivery-zones')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/admin/delivery-zones', () => {
  it('201 — cria zona de entrega', async () => {
    const token = await adminToken();

    const res = await request(app)
      .post('/api/admin/delivery-zones')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Centro', fee: 5.0, active: true });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Centro');
    expect(res.body.data.fee).toBe(5.0);
  });

  it('201 — upsert atualiza taxa de zona existente', async () => {
    const token = await adminToken();
    await prisma.deliveryZone.create({ data: { name: 'Centro', fee: 5.0 } });

    const res = await request(app)
      .post('/api/admin/delivery-zones')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Centro', fee: 7.0, active: true });

    expect(res.status).toBe(201);
    expect(res.body.data.fee).toBe(7.0);

    const total = await prisma.deliveryZone.count({ where: { name: 'Centro' } });
    expect(total).toBe(1);
  });
});

describe('GET /api/admin/config', () => {
  it('200 — retorna configuração da loja', async () => {
    const token = await adminToken();
    await prisma.storeConfig.create({
      data: { isOpen: true, openingHours: {}, whatsappNumber: '11999990000' },
    });

    const res = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isOpen).toBe(true);
  });

  it('200 — retorna null quando sem config', async () => {
    const token = await adminToken();

    const res = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe('PUT /api/admin/config', () => {
  it('200 — atualiza configuração', async () => {
    const token = await adminToken();

    const res = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isOpen: false,
        openingHours: { seg: { open: '18:00', close: '23:00', closed: false } },
        whatsappNumber: '5535999990000',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.isOpen).toBe(false);
  });
});
