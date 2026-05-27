import type { Request, Response } from 'express';
import { getMenuService, getProductService, getDeliveryZonesService, getStoreStatusService } from './menu.service.js';
import { success } from '../../utils/apiResponse.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';

export async function getMenu(_req: Request, res: Response) {
  return success(res, await getMenuService());
}

export async function getProduct(req: Request, res: Response) {
  const product = await getProductService(req.params.id as string);
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return success(res, product);
}

export async function getDeliveryZones(_req: Request, res: Response) {
  return success(res, await getDeliveryZonesService());
}

export async function getStoreStatus(_req: Request, res: Response) {
  return success(res, await getStoreStatusService());
}
