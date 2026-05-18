import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productOption: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    optionItem: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deliveryZone: { findMany: vi.fn(), upsert: vi.fn() },
    storeConfig: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import prisma from '../../config/prisma.js';
import {
  listCategoriesService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  updateProductService,
  deleteProductService,
  toggleProductService,
  createProductOptionService,
  updateProductOptionService,
  deleteProductOptionService,
  createOptionItemService,
  updateOptionItemService,
  deleteOptionItemService,
  listDeliveryZonesService,
  upsertDeliveryZoneService,
  getStoreConfigService,
  updateStoreConfigService,
} from './admin.service.js';

const mockCategory = { id: 'cat1', name: 'Burgers', slug: 'burgers', position: 1, active: true };
const mockProduct = { id: 'p1', categoryId: 'cat1', name: 'Classic', price: 29.9, active: true };
const mockOption = { id: 'opt1', productId: 'p1', label: 'Ponto', type: 'RADIO', required: true };
const mockItem = { id: 'item1', optionId: 'opt1', name: 'Ao ponto', additionalPrice: 0 };

beforeEach(() => vi.clearAllMocks());

// ─── Categorias ───────────────────────────────────────────────────────────────

describe('listCategoriesService', () => {
  it('retorna lista de categorias', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([mockCategory] as any);
    const result = await listCategoriesService();
    expect(result).toHaveLength(1);
  });
});

describe('createCategoryService', () => {
  it('cria e retorna categoria', async () => {
    vi.mocked(prisma.category.create).mockResolvedValue(mockCategory as any);
    const result = await createCategoryService({
      name: 'Burgers',
      slug: 'burgers',
      position: 1,
      active: true,
    });
    expect(result.slug).toBe('burgers');
  });
});

describe('updateCategoryService', () => {
  it('atualiza categoria existente', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(prisma.category.update).mockResolvedValue({
      ...mockCategory,
      name: 'Burgers 2',
    } as any);

    const result = await updateCategoryService('cat1', {
      name: 'Burgers 2',
      slug: 'burgers',
      position: 1,
      active: true,
    });

    expect(result.name).toBe('Burgers 2');
  });

  it('lança 404 quando categoria não existe', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(
      updateCategoryService('missing', { name: 'X', slug: 'x', position: 0, active: true }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'CATEGORY_NOT_FOUND' });
  });
});

describe('deleteCategoryService', () => {
  it('deleta categoria sem produtos', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      ...mockCategory,
      _count: { products: 0 },
    } as any);
    vi.mocked(prisma.category.delete).mockResolvedValue(mockCategory as any);

    await deleteCategoryService('cat1');

    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
  });

  it('lança 409 quando categoria tem produtos', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      ...mockCategory,
      _count: { products: 3 },
    } as any);

    await expect(deleteCategoryService('cat1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CATEGORY_HAS_PRODUCTS',
    });
  });

  it('lança 404 quando categoria não existe', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(deleteCategoryService('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'CATEGORY_NOT_FOUND',
    });
  });
});

// ─── Produtos ─────────────────────────────────────────────────────────────────

describe('updateProductService', () => {
  it('atualiza produto existente', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...mockProduct, price: 34.9 } as any);

    const result = await updateProductService('p1', {
      categoryId: 'cat1',
      name: 'Classic',
      price: 34.9,
      active: true,
    });

    expect(result.price).toBe(34.9);
  });

  it('lança 404 quando produto não existe', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(
      updateProductService('missing', {
        categoryId: 'cat1',
        name: 'X',
        price: 10,
        active: true,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'PRODUCT_NOT_FOUND' });
  });
});

describe('toggleProductService', () => {
  it('desativa produto ativo', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ ...mockProduct, active: true } as any);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...mockProduct, active: false } as any);

    const result = await toggleProductService('p1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } }),
    );
    expect(result.active).toBe(false);
  });

  it('ativa produto inativo', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      ...mockProduct,
      active: false,
    } as any);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...mockProduct, active: true } as any);

    const result = await toggleProductService('p1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: true } }),
    );
    expect(result.active).toBe(true);
  });
});

// ─── Opções ───────────────────────────────────────────────────────────────────

describe('createProductOptionService', () => {
  it('cria opção para produto existente', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.productOption.create).mockResolvedValue(mockOption as any);

    const result = await createProductOptionService('p1', {
      label: 'Ponto',
      type: 'RADIO',
      required: true,
    });

    expect(prisma.productOption.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 'p1' }) }),
    );
    expect(result.label).toBe('Ponto');
  });

  it('lança 404 quando produto não existe', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(
      createProductOptionService('missing', { label: 'X', type: 'RADIO', required: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'PRODUCT_NOT_FOUND' });
  });
});

describe('updateProductOptionService', () => {
  it('atualiza opção existente', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(mockOption as any);
    vi.mocked(prisma.productOption.update).mockResolvedValue({
      ...mockOption,
      label: 'Ponto da carne',
    } as any);

    const result = await updateProductOptionService('opt1', {
      label: 'Ponto da carne',
      type: 'RADIO',
      required: true,
    });

    expect(result.label).toBe('Ponto da carne');
  });

  it('lança 404 quando opção não existe', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(null);

    await expect(
      updateProductOptionService('missing', { label: 'X', type: 'RADIO', required: false }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'OPTION_NOT_FOUND' });
  });
});

// ─── Itens de opção ───────────────────────────────────────────────────────────

describe('createOptionItemService', () => {
  it('cria item para opção existente', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(mockOption as any);
    vi.mocked(prisma.optionItem.create).mockResolvedValue(mockItem as any);

    const result = await createOptionItemService('opt1', { name: 'Ao ponto', additionalPrice: 0 });

    expect(prisma.optionItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ optionId: 'opt1' }) }),
    );
    expect(result.name).toBe('Ao ponto');
  });

  it('lança 404 quando opção não existe', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(null);

    await expect(
      createOptionItemService('missing', { name: 'X', additionalPrice: 0 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'OPTION_NOT_FOUND' });
  });
});

describe('deleteOptionItemService', () => {
  it('deleta item existente', async () => {
    vi.mocked(prisma.optionItem.findUnique).mockResolvedValue(mockItem as any);
    vi.mocked(prisma.optionItem.delete).mockResolvedValue(mockItem as any);

    await deleteOptionItemService('item1');

    expect(prisma.optionItem.delete).toHaveBeenCalledWith({ where: { id: 'item1' } });
  });

  it('lança 404 quando item não existe', async () => {
    vi.mocked(prisma.optionItem.findUnique).mockResolvedValue(null);

    await expect(deleteOptionItemService('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ITEM_NOT_FOUND',
    });
  });
});

// ─── updateOptionItemService ──────────────────────────────────────────────────

describe('updateOptionItemService', () => {
  it('atualiza item existente', async () => {
    vi.mocked(prisma.optionItem.findUnique).mockResolvedValue(mockItem as any);
    vi.mocked(prisma.optionItem.update).mockResolvedValue({
      ...mockItem,
      name: 'Bem passado',
    } as any);

    const result = await updateOptionItemService('item1', {
      name: 'Bem passado',
      additionalPrice: 0,
    });

    expect(result.name).toBe('Bem passado');
  });

  it('lança 404 quando item não existe', async () => {
    vi.mocked(prisma.optionItem.findUnique).mockResolvedValue(null);

    await expect(
      updateOptionItemService('missing', { name: 'X', additionalPrice: 0 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ITEM_NOT_FOUND' });
  });
});

// ─── deleteProductOptionService ───────────────────────────────────────────────

describe('deleteProductOptionService', () => {
  it('deleta opção existente', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(mockOption as any);
    vi.mocked(prisma.productOption.delete).mockResolvedValue(mockOption as any);

    await deleteProductOptionService('opt1');

    expect(prisma.productOption.delete).toHaveBeenCalledWith({ where: { id: 'opt1' } });
  });

  it('lança 404 quando opção não existe', async () => {
    vi.mocked(prisma.productOption.findUnique).mockResolvedValue(null);

    await expect(deleteProductOptionService('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'OPTION_NOT_FOUND',
    });
  });
});

// ─── deleteProductService ─────────────────────────────────────────────────────

describe('deleteProductService', () => {
  it('deleta produto existente', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.product.delete).mockResolvedValue(mockProduct as any);

    await deleteProductService('p1');

    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('lança 404 quando produto não existe', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(deleteProductService('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });
  });
});

// ─── listDeliveryZonesService ─────────────────────────────────────────────────

describe('listDeliveryZonesService', () => {
  it('retorna zonas de entrega ordenadas por nome', async () => {
    const zones = [
      { id: 'z1', name: 'Centro', fee: 5.0, active: true },
      { id: 'z2', name: 'Jardim', fee: 8.0, active: true },
    ];
    vi.mocked(prisma.deliveryZone.findMany).mockResolvedValue(zones as any);

    const result = await listDeliveryZonesService();

    expect(result).toHaveLength(2);
    expect(prisma.deliveryZone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
  });
});

// ─── upsertDeliveryZoneService ────────────────────────────────────────────────

describe('upsertDeliveryZoneService', () => {
  it('cria zona quando não existe', async () => {
    const zone = { id: 'z1', name: 'Centro', fee: 5.0, active: true };
    vi.mocked(prisma.deliveryZone.upsert).mockResolvedValue(zone as any);

    const result = await upsertDeliveryZoneService({ name: 'Centro', fee: 5.0, active: true });

    expect(result.name).toBe('Centro');
    expect(prisma.deliveryZone.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'Centro' } }),
    );
  });

  it('atualiza zona existente', async () => {
    const zone = { id: 'z1', name: 'Centro', fee: 6.0, active: true };
    vi.mocked(prisma.deliveryZone.upsert).mockResolvedValue(zone as any);

    const result = await upsertDeliveryZoneService({ name: 'Centro', fee: 6.0, active: true });

    expect(result.fee).toBe(6.0);
  });
});

// ─── getStoreConfigService ────────────────────────────────────────────────────

describe('getStoreConfigService', () => {
  it('retorna configuração da loja', async () => {
    const config = { id: 'cfg1', isOpen: true, openingHours: {}, whatsappNumber: '11999990000' };
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue(config as any);

    const result = await getStoreConfigService();

    expect(result?.isOpen).toBe(true);
  });

  it('retorna null quando não há configuração', async () => {
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue(null);

    const result = await getStoreConfigService();

    expect(result).toBeNull();
  });
});

// ─── updateStoreConfigService ─────────────────────────────────────────────────

describe('updateStoreConfigService', () => {
  const configData = {
    isOpen: false,
    openingHours: { seg: { open: '18:00', close: '23:00', closed: false } },
  };

  it('atualiza configuração existente', async () => {
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue({ id: 'cfg1' } as any);
    vi.mocked(prisma.storeConfig.update).mockResolvedValue({ id: 'cfg1', ...configData } as any);

    const result = await updateStoreConfigService(configData);

    expect(prisma.storeConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cfg1' } }),
    );
    expect(result.isOpen).toBe(false);
  });

  it('cria configuração quando não existe nenhuma', async () => {
    vi.mocked(prisma.storeConfig.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.storeConfig.create).mockResolvedValue({ id: 'cfg_new', ...configData } as any);

    const result = await updateStoreConfigService(configData);

    expect(prisma.storeConfig.create).toHaveBeenCalledOnce();
    expect(result.isOpen).toBe(false);
  });
});
