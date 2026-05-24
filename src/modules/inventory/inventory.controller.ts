import type { Request, Response } from 'express';
import {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getProductIngredients,
  setProductIngredients,
  listStockMovements,
} from './inventory.service.js';

export async function handleListIngredients(_req: Request, res: Response) {
  const data = await listIngredients();
  res.json({ data });
}

export async function handleCreateIngredient(req: Request, res: Response) {
  const data = await createIngredient(req.body);
  res.status(201).json({ data });
}

export async function handleUpdateIngredient(req: Request, res: Response) {
  const data = await updateIngredient(req.params.id as string, req.body);
  res.json({ data });
}

export async function handleDeleteIngredient(req: Request, res: Response) {
  await deleteIngredient(req.params.id as string);
  res.status(204).send();
}

export async function handleGetProductIngredients(req: Request, res: Response) {
  const data = await getProductIngredients(req.params.productId as string);
  res.json({ data });
}

export async function handleSetProductIngredients(req: Request, res: Response) {
  const { ingredients } = req.body as { ingredients: { ingredientId: string; quantity: number }[] };
  await setProductIngredients(req.params.productId as string, ingredients ?? []);
  res.json({ data: { ok: true } });
}

export async function handleListStockMovements(req: Request, res: Response) {
  const ingredientId = req.query.ingredientId as string | undefined;
  const limit = Number(req.query.limit) || 100;
  const data = await listStockMovements(ingredientId, limit);
  res.json({ data });
}
