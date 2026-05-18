import type { Request, Response } from 'express';
import { createPaymentIntentService } from './payments.service.js';
import { success } from '../../utils/apiResponse.js';

export async function createPaymentIntent(req: Request, res: Response) {
  const { orderId } = req.body as { orderId: string };
  const result = await createPaymentIntentService(req.user!.id, orderId);
  return success(res, result);
}
