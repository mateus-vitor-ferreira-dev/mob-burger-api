import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { adminToken, customerToken, createCategory, createProduct } from '../helpers.js';

describe('GET /api/menu', () => {
  it('200 — retorna array vazio quando não há categorias ativas', async () => {
    const res = await request(app).get('/api/menu');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200 — retorna categorias com produtos e opções', async () => {
    const cat = await createCategory({ name: 'Burgers', slug: 'burgers' });
    await createProduct(cat.id, { name: 'Classic Burger' });

    const res = await request(app).get('/api/menu');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].products).toHaveLength(1);
    expect(res.body.data[0].products[0].name).toBe('Classic Burger');
  });

  it('200 — não exibe produtos inativos', async () => {
    const cat = await createCategory({ name: 'Combos', slug: 'combos' });
    await createProduct(cat.id, { name: 'Produto inativo', active: false });

    const res = await request(app).get('/api/menu');

    expect(res.body.data[0].products).toHaveLength(0);
  });
});

describe('GET /api/menu/product/:id', () => {
  it('200 — retorna produto com opções', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id);

    const res = await request(app).get(`/api/menu/product/${prod.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(prod.id);
    expect(res.body.data).toHaveProperty('category');
    expect(res.body.data).toHaveProperty('options');
  });

  it('404 — produto não encontrado', async () => {
    const res = await request(app).get('/api/menu/product/id_que_nao_existe');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('POST /api/admin/categories', () => {
  it('201 — admin cria categoria', async () => {
    const token = await adminToken();

    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bebidas', slug: 'bebidas', position: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('bebidas');
  });

  it('401 — sem token', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .send({ name: 'X', slug: 'x', position: 1 });

    expect(res.status).toBe(401);
  });

  it('403 — cliente não pode criar categoria', async () => {
    const token = await customerToken();

    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', slug: 'x', position: 1 });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/admin/categories/:id', () => {
  it('200 — atualiza categoria', async () => {
    const token = await adminToken();
    const cat = await createCategory();

    const res = await request(app)
      .put(`/api/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Burgers Especiais', slug: 'burgers', position: 1, active: true });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Burgers Especiais');
  });
});

describe('DELETE /api/admin/categories/:id', () => {
  it('204 — deleta categoria vazia', async () => {
    const token = await adminToken();
    const cat = await createCategory({ name: 'Vazia', slug: 'vazia' });

    const res = await request(app)
      .delete(`/api/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('409 — não deleta categoria com produtos', async () => {
    const token = await adminToken();
    const cat = await createCategory();
    await createProduct(cat.id);

    const res = await request(app)
      .delete(`/api/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
  });
});

describe('PATCH /api/admin/products/:id/toggle', () => {
  it('200 — toggle desativa produto ativo', async () => {
    const token = await adminToken();
    const cat = await createCategory();
    const prod = await createProduct(cat.id, { active: true });

    const res = await request(app)
      .patch(`/api/admin/products/${prod.id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(false);
  });
});
