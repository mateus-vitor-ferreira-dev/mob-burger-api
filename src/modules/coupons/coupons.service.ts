import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';
import { MSG } from '../../constants/messages/index.js';
import type { CouponType } from '@prisma/client';

export interface ValidateResult {
  valid: boolean;
  couponId: string;
  type: CouponType;
  discountAmount: number;
  message: string;
}

// Returns Brazil local time (UTC-3, ignoring DST for simplicity — good enough for MVP)
function nowBR(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function todayRangeBR(): { start: Date; end: Date } {
  const br = nowBR();
  const start = new Date(br);
  start.setHours(0, 0, 0, 0);
  const end = new Date(br);
  end.setHours(23, 59, 59, 999);
  // Convert back to UTC for Prisma queries
  const offsetMs = 3 * 60 * 60 * 1000;
  return { start: new Date(start.getTime() + offsetMs), end: new Date(end.getTime() + offsetMs) };
}

export async function validateCouponService(
  code: string,
  itemsTotal: number,
  deliveryFee: number,
  customerId: string,
): Promise<ValidateResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });

  if (!coupon) throw new AppError(MSG.coupon.invalid, HTTP.UNPROCESSABLE, 'COUPON_INVALID');
  if (!coupon.active) throw new AppError(MSG.coupon.inactive, HTTP.UNPROCESSABLE, 'COUPON_INACTIVE');

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt)
    throw new AppError(MSG.coupon.notStarted, HTTP.UNPROCESSABLE, 'COUPON_NOT_STARTED');
  if (coupon.expiresAt && now > coupon.expiresAt)
    throw new AppError(MSG.coupon.expired, HTTP.UNPROCESSABLE, 'COUPON_EXPIRED');
  if (coupon.minOrderValue > 0 && itemsTotal < coupon.minOrderValue)
    throw new AppError(
      `${MSG.coupon.minValue} (mínimo: R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')})`,
      HTTP.UNPROCESSABLE,
      'COUPON_MIN_VALUE',
    );

  const notCancelled = { NOT: { status: 'CANCELLED' as const } };

  if (coupon.maxUsesTotal !== null) {
    const uses = await prisma.order.count({ where: { couponId: coupon.id, ...notCancelled } });
    if (uses >= coupon.maxUsesTotal)
      throw new AppError(MSG.coupon.exhausted, HTTP.UNPROCESSABLE, 'COUPON_EXHAUSTED');
  }

  if (coupon.maxUsesPerDay !== null) {
    const { start, end } = todayRangeBR();
    const uses = await prisma.order.count({
      where: { couponId: coupon.id, createdAt: { gte: start, lte: end }, ...notCancelled },
    });
    if (uses >= coupon.maxUsesPerDay)
      throw new AppError(MSG.coupon.dailyLimit, HTTP.UNPROCESSABLE, 'COUPON_DAILY_LIMIT');
  }

  if (coupon.maxUsesPerUser !== null) {
    const uses = await prisma.order.count({
      where: { couponId: coupon.id, customerId, ...notCancelled },
    });
    if (uses >= coupon.maxUsesPerUser)
      throw new AppError(MSG.coupon.userLimit, HTTP.UNPROCESSABLE, 'COUPON_USER_LIMIT');
  }

  let discountAmount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discountAmount = Number(((itemsTotal * coupon.value) / 100).toFixed(2));
  } else if (coupon.type === 'FIXED_AMOUNT') {
    discountAmount = Number(Math.min(coupon.value, itemsTotal).toFixed(2));
  } else if (coupon.type === 'FREE_DELIVERY') {
    discountAmount = deliveryFee;
  }

  return { valid: true, couponId: coupon.id, type: coupon.type, discountAmount, message: 'Cupom aplicado!' };
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  maxUsesTotal?: number | null;
  maxUsesPerDay?: number | null;
  maxUsesPerUser?: number | null;
  active?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
}

export async function listCouponsService() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
  return coupons.map((c) => ({ ...c, usageCount: c._count.orders, _count: undefined }));
}

export async function createCouponService(data: CouponInput) {
  const code = data.code.toUpperCase().trim().replace(/\s+/g, '');
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new AppError('Já existe um cupom com este código.', HTTP.CONFLICT, 'COUPON_CODE_EXISTS');
  return prisma.coupon.create({
    data: {
      code,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue ?? 0,
      maxUsesTotal: data.maxUsesTotal ?? null,
      maxUsesPerDay: data.maxUsesPerDay ?? null,
      maxUsesPerUser: data.maxUsesPerUser ?? null,
      active: data.active ?? true,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
}

export async function updateCouponService(id: string, data: Partial<CouponInput>) {
  const patch: Record<string, unknown> = { ...data };
  if (data.code) patch.code = data.code.toUpperCase().trim().replace(/\s+/g, '');
  if ('startsAt' in data) patch.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if ('expiresAt' in data) patch.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  return prisma.coupon.update({ where: { id }, data: patch });
}

export async function deleteCouponService(id: string) {
  return prisma.coupon.delete({ where: { id } });
}
