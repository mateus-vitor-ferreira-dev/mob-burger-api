import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
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

export async function createCategoryService(data: CategoryInput) {
  return prisma.category.create({ data });
}

export async function updateCategoryService(id: string, data: CategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category)
    throw new AppError(MSG.menu.categoryNotFound, HTTP.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  return prisma.category.update({ where: { id }, data });
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
  return prisma.category.delete({ where: { id } });
}

// ─── Produtos ─────────────────────────────────────────────────────────────────

export async function listProductsService() {
  return prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { category: { select: { id: true, name: true } } },
  });
}

export async function createProductService(data: ProductInput) {
  return prisma.product.create({ data });
}

export async function updateProductService(id: string, data: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProductService(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return prisma.product.delete({ where: { id } });
}

export async function toggleProductService(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return prisma.product.update({ where: { id }, data: { active: !product.active } });
}

// ─── Opções de personalização ─────────────────────────────────────────────────

export async function createProductOptionService(productId: string, data: ProductOptionInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return prisma.productOption.create({ data: { ...data, productId } });
}

export async function updateProductOptionService(optionId: string, data: ProductOptionInput) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  return prisma.productOption.update({ where: { id: optionId }, data });
}

export async function deleteProductOptionService(optionId: string) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  return prisma.productOption.delete({ where: { id: optionId } });
}

// ─── Itens de opção ───────────────────────────────────────────────────────────

export async function createOptionItemService(optionId: string, data: OptionItemInput) {
  const option = await prisma.productOption.findUnique({ where: { id: optionId } });
  if (!option) throw new AppError('Opção não encontrada.', HTTP.NOT_FOUND, 'OPTION_NOT_FOUND');
  return prisma.optionItem.create({ data: { ...data, optionId } });
}

export async function updateOptionItemService(itemId: string, data: OptionItemInput) {
  const item = await prisma.optionItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item não encontrado.', HTTP.NOT_FOUND, 'ITEM_NOT_FOUND');
  return prisma.optionItem.update({ where: { id: itemId }, data });
}

export async function deleteOptionItemService(itemId: string) {
  const item = await prisma.optionItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item não encontrado.', HTTP.NOT_FOUND, 'ITEM_NOT_FOUND');
  return prisma.optionItem.delete({ where: { id: itemId } });
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

// ─── Config da loja ───────────────────────────────────────────────────────────

export async function getStoreConfigService() {
  return prisma.storeConfig.findFirst();
}

export async function updateStoreConfigService(data: StoreConfigInput) {
  const existing = await prisma.storeConfig.findFirst();
  if (existing) {
    return prisma.storeConfig.update({ where: { id: existing.id }, data });
  }
  return prisma.storeConfig.create({ data });
}
