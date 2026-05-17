import type { Request, Response } from 'express';
import { createOrderService, getOrderService, listOrdersService, updateOrderStatusService } from './orders.service.js';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import type { CreateOrderInput, UpdateStatusInput } from './orders.schema.js';

export async function createOrder(req: Request, res: Response) {
  const order = await createOrderService(req.body as CreateOrderInput);
  return success(res, order, HTTP.CREATED);
}

export async function getOrder(req: Request, res: Response) {
  const order = await getOrderService(req.params.id);
  return success(res, order);
}

export async function listOrders(req: Request, res: Response) {
  const orders = await listOrdersService(req.query.status as string | undefined);
  return success(res, orders);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const order = await updateOrderStatusService(req.params.id, req.body as UpdateStatusInput);
  return success(res, order);
}
