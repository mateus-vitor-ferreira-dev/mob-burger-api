import type { Request, Response } from 'express';
import { getMenuService, getProductService } from './menu.service.js';
import { success } from '../../utils/apiResponse.js';
import AppError from '../../utils/AppError.js';
import { MSG } from '../../constants/messages/index.js';
import { HTTP } from '../../constants/httpStatus.js';

export async function getMenu(_req: Request, res: Response) {
  const menu = await getMenuService();
  return success(res, menu);
}

export async function getProduct(req: Request, res: Response) {
  const product = await getProductService(req.params.id);
  if (!product) throw new AppError(MSG.menu.productNotFound, HTTP.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return success(res, product);
}
