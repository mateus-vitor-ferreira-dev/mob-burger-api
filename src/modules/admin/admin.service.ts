import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import type { ProductInput, CategoryInput, DeliveryZoneInput, StoreConfigInput } from './admin.schema.js';

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

export async function createCategoryService(data: CategoryInput) {
  return prisma.category.create({ data });
}

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
