import type { Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import {
  listDriversService,
  createDriverService,
  updateDriverService,
  deleteDriverService,
} from './drivers.service.js';

export async function listDrivers(req: Request, res: Response) {
  const onlyActive = req.query.active === 'true';
  return success(res, await listDriversService(onlyActive));
}

export async function createDriver(req: Request, res: Response) {
  const { name, phone } = req.body as { name: string; phone: string };
  return success(res, await createDriverService({ name, phone }), HTTP.CREATED);
}

export async function updateDriver(req: Request, res: Response) {
  const data = req.body as { name?: string; phone?: string; active?: boolean };
  return success(res, await updateDriverService(req.params.id as string, data));
}

export async function deleteDriver(req: Request, res: Response) {
  await deleteDriverService(req.params.id as string);
  return success(res, null, HTTP.NO_CONTENT);
}
