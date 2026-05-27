import type { Request, Response } from 'express';
import { createPaymentIntentService } from './payments.service.js';
import { success } from '../../utils/apiResponse.js';

export async function createPaymentIntent(req: Request, res: Response) {
  const { orderId } = req.body as { orderId: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await createPaymentIntentService((req as any).user!.id, orderId);
  return success(res, result);
}
