import type { Request, Response } from 'express';
import * as adminService from './admin.service.js';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import type { ProductInput, CategoryInput, DeliveryZoneInput, StoreConfigInput } from './admin.schema.js';

export async function createProduct(req: Request, res: Response) {
  const product = await adminService.createProductService(req.body as ProductInput);
  return success(res, product, HTTP.CREATED);
}

export async function updateProduct(req: Request, res: Response) {
  const product = await adminService.updateProductService(req.params.id, req.body as ProductInput);
  return success(res, product);
}

export async function deleteProduct(req: Request, res: Response) {
  await adminService.deleteProductService(req.params.id);
  return res.status(HTTP.NO_CONTENT).send();
}

export async function toggleProduct(req: Request, res: Response) {
  const product = await adminService.toggleProductService(req.params.id);
  return success(res, product);
}

export async function createCategory(req: Request, res: Response) {
  const category = await adminService.createCategoryService(req.body as CategoryInput);
  return success(res, category, HTTP.CREATED);
}

export async function listDeliveryZones(_req: Request, res: Response) {
  const zones = await adminService.listDeliveryZonesService();
  return success(res, zones);
}

export async function upsertDeliveryZone(req: Request, res: Response) {
  const zone = await adminService.upsertDeliveryZoneService(req.body as DeliveryZoneInput);
  return success(res, zone, HTTP.CREATED);
}

export async function getStoreConfig(_req: Request, res: Response) {
  const config = await adminService.getStoreConfigService();
  return success(res, config);
}

export async function updateStoreConfig(req: Request, res: Response) {
  const config = await adminService.updateStoreConfigService(req.body as StoreConfigInput);
  return success(res, config);
}
