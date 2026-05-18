import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './prisma.js';

export async function createAdmin(email = 'admin@test.com', password = 'senha123') {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { email, passwordHash: hash, role: 'ADMIN' } });
}

export async function createAttendant(email = 'atendente@test.com', password = 'senha123') {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { email, passwordHash: hash, role: 'ATTENDANT' } });
}

export async function createCustomer(
  overrides: Partial<{
    name: string;
    email: string;
    phone: string;
    password: string;
  }> = {},
) {
  const data = {
    name: 'Cliente Teste',
    email: 'cliente@test.com',
    phone: '11999990000',
    password: 'senha123',
    ...overrides,
  };
  const hash = await bcrypt.hash(data.password, 10);
  return prisma.customer.create({
    data: { name: data.name, email: data.email, phone: data.phone, passwordHash: hash },
  });
}

export async function adminToken(email = 'admin@test.com', password = 'senha123') {
  await createAdmin(email, password);
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken as string;
}

export async function customerToken(email = 'cliente@test.com', password = 'senha123') {
  await createCustomer({ email, password });
  const res = await request(app).post('/api/auth/customer/login').send({ email, password });
  return res.body.data.accessToken as string;
}

export async function createCategory(
  overrides: Partial<{
    name: string;
    slug: string;
    position: number;
  }> = {},
) {
  return prisma.category.create({
    data: { name: 'Burgers', slug: 'burgers', position: 1, ...overrides },
  });
}

export async function createProduct(
  categoryId: string,
  overrides: Partial<{
    name: string;
    price: number;
    active: boolean;
  }> = {},
) {
  return prisma.product.create({
    data: {
      categoryId,
      name: 'Classic Burger',
      description: 'Um burger clássico',
      price: 29.9,
      active: true,
      ...overrides,
    },
  });
}

export async function createOrderForCustomer(
  customerId: string,
  productId: string,
  paymentMethod = 'CASH_ON_DELIVERY',
) {
  return prisma.order.create({
    data: {
      orderNumber: 1,
      customerId,
      type: 'PICKUP',
      status: 'AWAITING_PAYMENT',
      totalPrice: 29.9,
      paymentMethod: paymentMethod as any,
      items: {
        create: [
          {
            productId,
            quantity: 1,
            unitPrice: 29.9,
          },
        ],
      },
    },
  });
}

export { prisma } from './prisma.js';
