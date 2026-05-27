import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import { invalidateMenuCache } from '../menu/menu.service.js';
import type {
  CategoryInput,
  ProductInput,
  ProductOptionInput,
  OptionItemInput,
  DeliveryZoneInput,
  StoreConfigInput,
} from './admin.schema.js';

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function listCategoriesService() {
  return prisma.category.findMany({ orderBy: { position: 'asc' } });
}

export async function reorderCategoriesService(items: { id: string; position: number }[]) {
  await Promise.all(
    items.map((item) => prisma.category.update({ where: { id: item.id }, data: { position: item.position } })),
  );
  invalidateMenuCache();
}

export async function reorderProductsService(items: { id: string; position: number }[]) {
  await Promise.all(
    items.map((item) => prisma.product.update({ where: { id: item.id }, data: { position: item.position } })),
  );
  invalidateMenuCache();
}

export async function createCategoryService(data: CategoryInput) {
  const result = await prisma.category.create({ data });
  invalidateMenuCache();
  return result;
}

export async function updateCategoryService(id: string, data: CategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category)
    throw new AppError(MSG.menu.categoryNotFound, HTTP.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  const result = await prisma.category.update({ where: { id }, data });
  invalidateMenuCache();
  return result;
}

export async function deleteCategoryService(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category)
    throw new AppError(MSG.menu.categoryNotFound, HTTP.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  if (category._count.products > 0) {
    throw new AppError(
      'Não é possível excluir uma categoria com produtos. Remova os produtos primeiro.',
      HTTP.CONFLICT,
      'CATEGORY_HAS_PRODUCTS',
    );
  }
  const result = await prisma.category.delete({ where: { id } });
  invalidateMenuCache();
  return result;
}

// ─── Produtos ─────────────────────────────────────────────────────────────────

export async function listProductsService() {
  return prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function createProductService(data: ProductInput) {
  const result = await prisma.product.create({ data });
  invalidateMenuCache();
  return result;
}

export async function updateProductService(id: string, data: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const result = await prisma.product.update({ where: { id }, data });
  invalidateMenuCache();
  return result;
}

export async function deleteProductService(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const result = await prisma.product.delete({ where: { id } });
  invalidateMenuCache();
  return result;
}

export async function toggleProductService(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const result = await prisma.product.update({ where: { id }, data: { active: !product.active } });
  invalidateMenuCache();
  return result;
}

// ─── Opções de personalização ─────────────────────────────────────────────────

export async function listProductOptionsService(productId: string) {
  return prisma.productOption.findMany({
    where: { productId },
    include: { items: { orderBy: { name: 'asc' } } },
    orderBy: { label: 'asc' },
  });
}

export async function createProductOptionService(productId: string, data: ProductOptionInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const result = await prisma.productOption.create({ data: { ...data, productId } });
  invalidateMenuCache();
  return result;
}

export async function updateProductOptionService(optionId: string, data: ProductOptionInput) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  const result = await prisma.productOption.update({ where: { id: optionId }, data });
  invalidateMenuCache();
  return result;
}

export async function deleteProductOptionService(optionId: string) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  const result = await prisma.productOption.delete({ where: { id: optionId } });
  invalidateMenuCache();
  return result;
}

// ─── Itens de opção ───────────────────────────────────────────────────────────

export async function createOptionItemService(optionId: string, data: OptionItemInput) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  const result = await prisma.optionItem.create({ data: { ...data, optionId } });
  invalidateMenuCache();
  return result;
}

export async function updateOptionItemService(itemId: string, data: OptionItemInput) {
  const item = await prisma.optionItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item não encontrado.', HTTP.NOT_FOUND, 'ITEM_NOT_FOUND');
  const result = await prisma.optionItem.update({ where: { id: itemId }, data });
  invalidateMenuCache();
  return result;
}

export async function deleteOptionItemService(itemId: string) {
  const item = await prisma.optionItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item não encontrado.', HTTP.NOT_FOUND, 'ITEM_NOT_FOUND');
  const result = await prisma.optionItem.delete({ where: { id: itemId } });
  invalidateMenuCache();
  return result;
}

// ─── Zonas de entrega ─────────────────────────────────────────────────────────

export async function listDeliveryZonesService() {
  return prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } });
}

export async function upsertDeliveryZoneService(data: DeliveryZoneInput) {
  return prisma.deliveryZone.upsert({
    where: { name: data.name },
    create: data,
    update: { fee: data.fee, active: data.active },
  });
}

export async function deleteDeliveryZoneService(id: string) {
  const zone = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!zone) throw new AppError('Zona não encontrada.', HTTP.NOT_FOUND, 'ZONE_NOT_FOUND');
  return prisma.deliveryZone.delete({ where: { id } });
}

// ─── Stats / Dashboard ───────────────────────────────────────────────────────

export async function getStatsService(from?: Date, to?: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Filtro de período personalizado
  const rangeFilter = from && to
    ? { gte: from, lte: to }
    : undefined

  const [todayRev, weekRev, monthRev, allRev, rangeRev, byMethod, byStatus, todayCount, rangeCount] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: today } }, _sum: { totalPrice: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: startOfWeek } }, _sum: { totalPrice: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: startOfMonth } }, _sum: { totalPrice: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { totalPrice: true } }),
    rangeFilter ? prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: rangeFilter }, _sum: { totalPrice: true } }) : Promise.resolve(null),
    prisma.order.groupBy({ by: ['paymentMethod'], where: { paymentStatus: 'PAID', ...(rangeFilter && { createdAt: rangeFilter }) }, _sum: { totalPrice: true }, _count: true }),
    prisma.order.groupBy({ by: ['status'], _count: true, ...(rangeFilter && { where: { createdAt: rangeFilter } }) }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    rangeFilter ? prisma.order.count({ where: { createdAt: rangeFilter } }) : Promise.resolve(null),
  ])

  return {
    revenue: {
      today: todayRev._sum.totalPrice ?? 0,
      week: weekRev._sum.totalPrice ?? 0,
      month: monthRev._sum.totalPrice ?? 0,
      allTime: allRev._sum.totalPrice ?? 0,
      range: rangeRev?._sum.totalPrice ?? null,
    },
    byPaymentMethod: byMethod.map((m) => ({ method: m.paymentMethod, revenue: m._sum.totalPrice ?? 0, count: m._count })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    todayOrders: todayCount,
    rangeOrders: rangeCount,
  }
}

// ─── Daily revenue breakdown ──────────────────────────────────────────────────

export async function getDailyRevenueService(month: string) {
  const [year, m] = month.split('-').map(Number);
  const startOfMonth = new Date(year, m - 1, 1);
  const startOfNextMonth = new Date(year, m, 1);

  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'PAID', createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
    select: { totalPrice: true, createdAt: true },
  });

  const byDay: Record<string, number> = {};
  for (const order of orders) {
    const day = new Date(order.createdAt)
      .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    byDay[day] = (byDay[day] ?? 0) + order.totalPrice;
  }

  const lastDay = new Date(year, m, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const d = i + 1;
    const key = `${month}-${String(d).padStart(2, '0')}`;
    return { day: key, revenue: byDay[key] ?? 0 };
  });
}

// ─── Top produtos mais vendidos ───────────────────────────────────────────────

export async function getTopProductsService(limit = 8) {
  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
    where: { order: { paymentStatus: 'PAID' } },
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, imageUrl: true, price: true },
  });

  const map = Object.fromEntries(products.map((p) => [p.id, p]));
  return grouped
    .filter((g) => map[g.productId])
    .map((g) => ({ product: map[g.productId], quantity: g._sum.quantity ?? 0 }));
}

// ─── Config da loja ───────────────────────────────────────────────────────────

export async function getStoreConfigService() {
  return prisma.storeConfig.findFirst();
}

export async function updateStoreConfigService(data: StoreConfigInput) {
  const existing = await prisma.storeConfig.findFirst();
  const result = existing
    ? await prisma.storeConfig.update({ where: { id: existing.id }, data })
    : await prisma.storeConfig.create({ data });
  invalidateMenuCache();
  return result;
}

// ─── Gestão de staff ──────────────────────────────────────────────────────────

export async function listStaffService() {
  return prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createStaffService(email: string, password: string, role: 'ADMIN' | 'ATTENDANT') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('E-mail já cadastrado.', HTTP.CONFLICT, 'EMAIL_ALREADY_EXISTS');

  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, passwordHash, role },
    select: { id: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteStaffService(id: string, requesterId: string) {
  if (id === requesterId) throw new AppError('Não é possível remover a si mesmo.', HTTP.BAD_REQUEST, 'SELF_DELETE');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Usuário não encontrado.', HTTP.NOT_FOUND, 'NOT_FOUND');
  return prisma.user.delete({ where: { id } });
}

// ─── Adicionais globais ───────────────────────────────────────────────────────

import type { GlobalExtraInput } from './admin.schema.js';

export async function listAllExtrasService() {
  return prisma.globalExtra.findMany({ orderBy: { name: 'asc' } });
}

export async function createExtraService(data: GlobalExtraInput) {
  return prisma.globalExtra.create({ data: { name: data.name, price: data.price, imageUrl: data.imageUrl ?? null, active: data.active } });
}

export async function updateExtraService(id: string, data: GlobalExtraInput) {
  const extra = await prisma.globalExtra.findUnique({ where: { id } });
  if (!extra) throw new AppError('Adicional não encontrado.', HTTP.NOT_FOUND, 'EXTRA_NOT_FOUND');
  return prisma.globalExtra.update({ where: { id }, data: { name: data.name, price: data.price, imageUrl: data.imageUrl ?? null, active: data.active } });
}

export async function deleteExtraService(id: string) {
  const extra = await prisma.globalExtra.findUnique({ where: { id } });
  if (!extra) throw new AppError('Adicional não encontrado.', HTTP.NOT_FOUND, 'EXTRA_NOT_FOUND');
  return prisma.globalExtra.delete({ where: { id } });
}

export async function toggleExtraService(id: string) {
  const extra = await prisma.globalExtra.findUnique({ where: { id } });
  if (!extra) throw new AppError('Adicional não encontrado.', HTTP.NOT_FOUND, 'EXTRA_NOT_FOUND');
  return prisma.globalExtra.update({ where: { id }, data: { active: !extra.active } });
}

// ─── Combo config ─────────────────────────────────────────────────────────────

import type { ComboConfigInput } from './admin.schema.js';

export async function setComboConfigService(productId: string, config: ComboConfigInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Produto não encontrado.', HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');

  // Fetch burgers from allowed category slugs (active, inStock)
  const categories = await prisma.category.findMany({
    where: { slug: { in: config.allowedSlugs }, active: true },
    include: {
      products: {
        where: { active: true, inStock: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  const burgers = categories.flatMap((c) => c.products);
  if (burgers.length === 0) {
    throw new AppError('Nenhum produto encontrado nas categorias selecionadas.', HTTP.BAD_REQUEST, 'NO_BURGERS');
  }

  // Remove all existing options for this product (they'll be replaced)
  await prisma.productOption.deleteMany({ where: { productId } });

  // Create one RADIO option group per burger slot (sorted cheapest first)
  const sortedBurgers = [...burgers].sort((a, b) => a.price - b.price);
  for (let slot = 1; slot <= config.numBurgers; slot++) {
    const label = config.numBurgers === 1 ? 'Escolha o Lanche' : `Lanche ${slot}`;
    await prisma.productOption.create({
      data: {
        productId,
        label,
        type: 'RADIO',
        required: true,
        items: {
          create: sortedBurgers.map((b) => ({ name: b.name, additionalPrice: b.price })),
        },
      },
    });
  }

  // Create one RADIO option group per drink slot (sorted cheapest first)
  if (config.drinkSlugs && config.numDrinks > 0) {
    const drinkCats = await prisma.category.findMany({
      where: { slug: { in: config.drinkSlugs }, active: true },
      include: { products: { where: { active: true, inStock: true }, orderBy: { name: 'asc' } } },
    });
    const drinks = [...drinkCats.flatMap((c) => c.products)].sort((a, b) => a.price - b.price);
    for (let slot = 1; slot <= config.numDrinks; slot++) {
      const label = config.numDrinks === 1 ? 'Escolha a Bebida' : `Bebida ${slot}`;
      await prisma.productOption.create({
        data: {
          productId,
          label,
          type: 'RADIO',
          required: true,
          items: { create: drinks.map((d) => ({ name: d.name, additionalPrice: d.price })) },
        },
      });
    }
  }

  // Create one RADIO option group per dessert slot (sorted cheapest first)
  if (config.dessertSlugs && config.numDesserts && config.numDesserts > 0) {
    const dessertCats = await prisma.category.findMany({
      where: { slug: { in: config.dessertSlugs }, active: true },
      include: { products: { where: { active: true, inStock: true }, orderBy: { name: 'asc' } } },
    });
    const desserts = [...dessertCats.flatMap((c) => c.products)].sort((a, b) => a.price - b.price);
    for (let slot = 1; slot <= config.numDesserts; slot++) {
      const label = config.numDesserts === 1 ? 'Escolha a Sobremesa' : `Sobremesa ${slot}`;
      await prisma.productOption.create({
        data: {
          productId,
          label,
          type: 'RADIO',
          required: true,
          items: { create: desserts.map((d) => ({ name: d.name, additionalPrice: d.price })) },
        },
      });
    }
  }

  // price = 0: todo o valor está nos additionalPrices das opções
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      comboConfig: config as object,
      price: 0,
    },
  });

  invalidateMenuCache();
  return updated;
}
