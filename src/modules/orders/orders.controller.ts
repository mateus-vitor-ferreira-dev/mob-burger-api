import type { Request, Response } from 'express';
import {
  createOrderService,
  getOrderService,
  myOrdersService,
  listOrdersService,
  updateOrderStatusService,
  assignDriverService,
  cancelOrderByCustomerService,
} from './orders.service.js';
import { printOrderService } from '../print/print.service.js';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import type { CreateOrderInput, UpdateStatusInput } from './orders.schema.js';

export async function createOrder(req: Request, res: Response) {
  const order = await createOrderService(req.user!.id, req.body as CreateOrderInput);
  return success(res, order, HTTP.CREATED);
}

export async function getOrder(req: Request, res: Response) {
  const order = await getOrderService(req.params.id);
  return success(res, order);
}

export async function myOrders(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await myOrdersService(req.user!.id, page, limit);
  return success(res, result);
}

export async function listOrders(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const result = await listOrdersService(req.query.status as string | undefined, page, limit, from, to);
  return success(res, result);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const order = await updateOrderStatusService(req.params.id, req.body as UpdateStatusInput);
  return success(res, order);
}

export async function printOrder(req: Request, res: Response) {
  await printOrderService(req.params.id);
  return success(res, { message: 'Imprimindo...' });
}

export async function assignDriver(req: Request, res: Response) {
  const { driverId } = req.body as { driverId: string };
  return success(res, await assignDriverService(req.params.id as string, driverId));
}

export async function cancelOrderByCustomer(req: Request, res: Response) {
  const order = await cancelOrderByCustomerService(req.params.id, req.user!.id);
  return success(res, order);
}
