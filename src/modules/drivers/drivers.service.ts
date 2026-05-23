import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';

export async function listDriversService(onlyActive = false) {
  return prisma.driver.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createDriverService(data: { name: string; phone: string }) {
  return prisma.driver.create({ data });
}

export async function updateDriverService(id: string, data: { name?: string; phone?: string; active?: boolean }) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new AppError('Entregador não encontrado.', HTTP.NOT_FOUND, 'DRIVER_NOT_FOUND');
  return prisma.driver.update({ where: { id }, data });
}

export async function deleteDriverService(id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new AppError('Entregador não encontrado.', HTTP.NOT_FOUND, 'DRIVER_NOT_FOUND');
  await prisma.driver.delete({ where: { id } });
}
