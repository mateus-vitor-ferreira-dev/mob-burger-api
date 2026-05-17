import prisma from '../../config/prisma.js';

export async function getMenuService() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          options: {
            include: { items: { orderBy: { name: 'asc' } } },
          },
        },
      },
    },
  });
}

export async function getProductService(id: string) {
  return prisma.product.findFirst({
    where: { id, active: true },
    include: {
      category: true,
      options: { include: { items: true } },
    },
  });
}
