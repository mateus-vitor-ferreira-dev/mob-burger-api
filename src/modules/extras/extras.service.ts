import prisma from '../../config/prisma.js';

export async function listExtrasService() {
  return prisma.globalExtra.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
}
