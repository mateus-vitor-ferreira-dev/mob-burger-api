import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    customer: { findUnique: vi.fn() },
    storeConfig: { findFirst: vi.fn() },
    product: { findMany: vi.fn() },
    optionItem: { findMany: vi.fn() },
    deliveryZone: { findUnique: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('./orders.sse.js', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

vi.mock('../../utils/orderNumber.js', () => ({
  generateDailyOrderNumber: vi.fn().mockResolvedValue(1),
}));

import prisma from '../../config/prisma.js';
import { broadcastOrderUpdate } from './orders.sse.js';
import {
  createOrderService,
  getOrderService,
  updateOrderStatusService,
  listOrdersService,
  myOrdersService,
} from './orders.service.js';

const mockCustomer = { id: 'c1', name: 'João', email: 'j@test.com', phone: '11999990000' };
const mockProduct = { id: 'p1', name: 'Classic Burger', price: 29.9, active: true };
const mockOrder = {
  id: 'o1', orderNumber: 1, customerId: 'c1', type: 'PICKUP',
  status: 'AWAITING_PAYMENT', totalPrice: 29.9, paymentMethod: 'CASH_ON_DELIVERY',
  paymentStatus: 'PENDING', items: [], delivery: null, customer: mockCustomer,
};

const pickupInput = {
  type: 'PICKUP' as const,
  paymentMethod: 'CASH_ON_DELIVERY' as const,
  items: [{ productId: 'p1', quantity: 1, options: [] }],
};

beforeEach(() => vi.clearAllMocks());

// ─── createOrderService ───────────────────────────────────────────────────────

describe('createOrderService', () => {
  beforeEach(() => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct] as any);
    vi.mocked(prisma.optionItem.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.create).mockResolvedValue(mockOrder as any);
  });

  it('cria pedido pickup com sucesso', async () => {
    const order = await createOrderService('c1', pickupInput);

    expect(prisma.order.create).toHaveBeenCalledOnce();
    expect(order.orderNumber).toBe(1);
    expect(broadcastOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new_order' }),
    );
  });

  it('calcula totalPrice corretamente: (produto + adicional) × quantidade', async () => {
    const optionItem = { id: 'oi1', additionalPrice: 2.5 };
    vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct] as any);
    vi.mocked(prisma.optionItem.findMany).mockResolvedValue([optionItem] as any);
    vi.mocked(prisma.order.create).mockResolvedValue({ ...mockOrder, totalPrice: 64.8 } as any);

    // (29.90 + 2.50) × 2 = 64.80
    await createOrderService('c1', {
      ...pickupInput,
      items: [{ productId: 'p1', quantity: 2, options: [{ optionItemId: 'oi1' }] }],
    });

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalPrice: 64.8 }),
      }),
    );
  });

  it('inclui taxa de entrega no total para DELIVERY', async () => {
    vi.mocked(prisma.deliveryZone.findUnique).mockResolvedValue({ id: 'z1', fee: 7.0 } as any);

    await createOrderService('c1', {
      type: 'DELIVERY',
      paymentMethod: 'PIX',
      items: [{ productId: 'p1', quantity: 1, options: [] }],
      delivery: { street: 'Rua A', number: '1', neighborhood: 'Centro', zoneId: 'z1' },
    });

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalPrice: 36.9 }), // 29.90 + 7.00
      }),
    );
  });

  it('lança 404 quando cliente não existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    await expect(createOrderService('missing', pickupInput))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('lança 422 quando cliente não tem telefone', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ ...mockCustomer, phone: null } as any);

    await expect(createOrderService('c1', pickupInput))
      .rejects.toMatchObject({ statusCode: 422, code: 'PHONE_REQUIRED' });
  });

  it('lança 422 quando loja está fechada', async () => {
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue({ isOpen: false } as any);

    await expect(createOrderService('c1', pickupInput))
      .rejects.toMatchObject({ statusCode: 422, code: 'STORE_CLOSED' });
  });

  it('lança 400 quando produto não está disponível', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]); // nenhum produto encontrado

    await expect(createOrderService('c1', pickupInput))
      .rejects.toMatchObject({ statusCode: 400, code: 'PRODUCT_UNAVAILABLE' });
  });
});

// ─── getOrderService ──────────────────────────────────────────────────────────

describe('getOrderService', () => {
  it('retorna pedido quando encontrado', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const result = await getOrderService('o1');

    expect(result.id).toBe('o1');
  });

  it('lança 404 quando pedido não existe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    await expect(getOrderService('missing'))
      .rejects.toMatchObject({ statusCode: 404, code: 'ORDER_NOT_FOUND' });
  });
});

// ─── updateOrderStatusService ─────────────────────────────────────────────────

describe('updateOrderStatusService', () => {
  it('atualiza status em transição válida (CONFIRMED → PREPARING)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' } as any);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...mockOrder, status: 'PREPARING' } as any);

    const result = await updateOrderStatusService('o1', { status: 'PREPARING' });

    expect(result.status).toBe('PREPARING');
    expect(broadcastOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'status_update' }),
    );
  });

  it('lança 422 para transição inválida (DELIVERED → PREPARING)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockOrder, status: 'DELIVERED' } as any);

    await expect(updateOrderStatusService('o1', { status: 'PREPARING' }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('lança 422 para transição inválida (CANCELLED → CONFIRMED)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockOrder, status: 'CANCELLED' } as any);

    await expect(updateOrderStatusService('o1', { status: 'CONFIRMED' }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('lança 404 quando pedido não existe', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    await expect(updateOrderStatusService('missing', { status: 'CONFIRMED' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'ORDER_NOT_FOUND' });
  });
});

// ─── listOrdersService ────────────────────────────────────────────────────────

describe('listOrdersService', () => {
  it('retorna todos os pedidos sem filtro', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([mockOrder] as any);

    const result = await listOrdersService();

    expect(result).toHaveLength(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('filtra por status quando fornecido', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await listOrdersService('CONFIRMED');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'CONFIRMED' } }),
    );
  });
});

// ─── myOrdersService ─────────────────────────────────────────────────────────

describe('myOrdersService', () => {
  it('retorna os pedidos do cliente', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([mockOrder] as any);

    const result = await myOrdersService('c1');

    expect(result).toHaveLength(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'c1' } }),
    );
  });
});
