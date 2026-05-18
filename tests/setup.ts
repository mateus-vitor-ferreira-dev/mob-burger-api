import { beforeEach, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Roda migrations no banco de teste antes de qualquer teste
try {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'pipe',
  });
} catch {
  // migrations já aplicadas
}

// Limpa todas as tabelas antes de cada teste (ordem respeitando FK)
beforeEach(async () => {
  await prisma.$transaction([
    prisma.orderItemOption.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.deliveryInfo.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.optionItem.deleteMany(),
    prisma.productOption.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.deliveryZone.deleteMany(),
    prisma.storeConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
