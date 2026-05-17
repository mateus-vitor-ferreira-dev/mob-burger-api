import prisma from '../config/prisma.js';

export async function generateDailyOrderNumber(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.order.count({
    where: { createdAt: { gte: today } },
  });

  return count + 1;
}
