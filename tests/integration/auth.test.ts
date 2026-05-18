import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createAdmin, createCustomer } from '../helpers.js';

describe('POST /api/auth/customer/register', () => {
  it('201 — cria conta e retorna tokens', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ name: 'João', email: 'joao@test.com', phone: '11988887777', password: 'senha123' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.customer.email).toBe('joao@test.com');
  });

  it('409 — e-mail já cadastrado', async () => {
    await createCustomer({ email: 'dup@test.com' });

    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ name: 'Outro', email: 'dup@test.com', phone: '11900000001', password: 'senha123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('400 — campos obrigatórios faltando', async () => {
    const res = await request(app)
      .post('/api/auth/customer/register')
      .send({ email: 'incompleto@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/customer/login', () => {
  it('200 — retorna tokens com credenciais válidas', async () => {
    await createCustomer({ email: 'maria@test.com', password: 'senha123' });

    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'maria@test.com', password: 'senha123' });

    expect(res.status).toBe(200);
    expect(res.body.data.customer.email).toBe('maria@test.com');
  });

  it('401 — senha incorreta', async () => {
    await createCustomer({ email: 'c@test.com' });

    const res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'c@test.com', password: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/login (staff)', () => {
  it('200 — retorna tokens para admin', async () => {
    await createAdmin('murilo@test.com', 'admin123');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'murilo@test.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('401 — usuário inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao@existe.com', password: 'senha123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('200 — renova tokens com refresh token válido', async () => {
    await createCustomer({ email: 'r@test.com' });
    const login = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'r@test.com', password: 'senha123' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('401 — refresh token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token_invalido' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});
