import { Request, Response } from 'express';
import {
  listExpensesService,
  createExpenseService,
  updateExpenseService,
  deleteExpenseService,
} from './expenses.service.js';

export async function listExpenses(req: Request, res: Response) {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const expenses = await listExpensesService(month);
  res.json({ data: expenses });
}

export async function createExpense(req: Request, res: Response) {
  const { name, type, amount, month, items } = req.body;
  if (!name || !month)
    return res.status(400).json({ error: { message: 'name e month são obrigatórios' } });
  const expense = await createExpenseService({
    name,
    type: type ?? 'FIXED',
    amount: Number(amount ?? 0),
    month,
    items,
  });
  res.status(201).json({ data: expense });
}

export async function updateExpense(req: Request, res: Response) {
  const { id } = req.params;
  const expense = await updateExpenseService(id, req.body);
  res.json({ data: expense });
}

export async function deleteExpense(req: Request, res: Response) {
  const { id } = req.params;
  await deleteExpenseService(id);
  res.status(204).send();
}
