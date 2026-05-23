import prisma from '../../config/prisma.js';

interface ExpenseItem {
  name: string;
  price: number;
}

interface CreateExpenseInput {
  name: string;
  type: string;
  amount: number;
  month: string;
  items?: ExpenseItem[];
}

export async function listExpensesService(month: string) {
  return prisma.expense.findMany({
    where: { month },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}

export async function createExpenseService(data: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      name: data.name,
      type: data.type,
      amount: Number(data.amount),
      month: data.month,
      items: data.items ?? [],
    },
  });
}

export async function updateExpenseService(id: string, data: Partial<CreateExpenseInput>) {
  return prisma.expense.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      month: data.month,
      items: data.items !== undefined ? data.items : undefined,
    },
  });
}

export async function deleteExpenseService(id: string) {
  await prisma.expense.delete({ where: { id } });
}
