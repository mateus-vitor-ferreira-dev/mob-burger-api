import type { Request, Response } from 'express';
import { listExtrasService } from './extras.service.js';

export async function listExtras(req: Request, res: Response) {
  const extras = await listExtrasService();
  res.json({ data: extras });
}
