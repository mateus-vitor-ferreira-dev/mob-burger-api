import prisma from '../../config/prisma.js';

let menuCache: { data: unknown; ts: number } | null = null;
const MENU_TTL = 60_000;

export function invalidateMenuCache(): void {
  menuCache = null;
}

export async function getDeliveryZonesService() {
  return prisma.deliveryZone.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, fee: true },
  });
}

function computeScheduledOpen(
  openingHours: Record<string, { open: string; close: string; closed: boolean }>,
): boolean {
  // Convert to São Paulo time so the server (UTC) matches the store's local hours
  const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const dayKey = dayKeys[nowBR.getDay()];
  const day = openingHours[dayKey];
  if (!day || day.closed) return false;

  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const nowMins = nowBR.getHours() * 60 + nowBR.getMinutes();
  const openMins = toMins(day.open);
  let closeMins = toMins(day.close);
  if (closeMins === 0) closeMins = 24 * 60; // meia-noite

  return nowMins >= openMins && nowMins < closeMins;
}

export async function getStoreStatusService() {
  const config = await prisma.storeConfig.findFirst({
    select: { isOpen: true, openingHours: true, whatsappNumber: true },
  });
  if (!config) return { isOpen: false, openingHours: {}, whatsappNumber: null };

  const hours = config.openingHours as Record<string, { open: string; close: string; closed: boolean }> | null;
  const scheduledOpen = hours ? computeScheduledOpen(hours) : true;
  // Manual override (isOpen=false) prevalece; se true, segue o horário
  const effectivelyOpen = (config.isOpen ?? false) && scheduledOpen;

  return { ...config, isOpen: effectivelyOpen };
}

export async function getMenuService() {
  if (menuCache && Date.now() - menuCache.ts < MENU_TTL) {
    return menuCache.data;
  }
  const config = await prisma.storeConfig.findFirst({ select: { hideOutOfStock: true } });
  const data = await prisma.category.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        where: { active: true, ...(config?.hideOutOfStock ? { inStock: true } : {}) },
        orderBy: { name: 'asc' },
        include: {
          options: {
            include: { items: { orderBy: { name: 'asc' } } },
          },
        },
      },
    },
  });
  menuCache = { data, ts: Date.now() };
  return data;
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
