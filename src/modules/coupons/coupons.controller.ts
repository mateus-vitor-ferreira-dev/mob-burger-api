import type { Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import {
  validateCouponService,
  listCouponsService,
  createCouponService,
  updateCouponService,
  deleteCouponService,
  type CouponInput,
} from './coupons.service.js';

export async function validateCoupon(req: Request, res: Response) {
  const { code, itemsTotal, deliveryFee } = req.body as {
    code: string;
    itemsTotal: number;
    deliveryFee?: number;
  };
  const customerId = req.user?.id ?? '';
  const result = await validateCouponService(code, itemsTotal, deliveryFee ?? 0, customerId);
  return success(res, result);
}

export async function listCoupons(_req: Request, res: Response) {
  return success(res, await listCouponsService());
}

export async function createCoupon(req: Request, res: Response) {
  return success(res, await createCouponService(req.body as CouponInput), HTTP.CREATED);
}

export async function updateCoupon(req: Request, res: Response) {
  return success(res, await updateCouponService(req.params.id as string, req.body as Partial<CouponInput>));
}

export async function deleteCoupon(req: Request, res: Response) {
  await deleteCouponService(req.params.id as string);
  return res.status(HTTP.NO_CONTENT).send();
}
