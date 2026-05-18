import { z } from 'zod';

const orderItemOptionSchema = z.object({
  optionItemId: z.string().cuid(),
});

const orderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
  observations: z.string().max(200).optional(),
  options: z.array(orderItemOptionSchema).default([]),
});

const deliveryInfoSchema = z.object({
  street: z.string().min(2),
  number: z.string().min(1),
  neighborhood: z.string().min(2),
  complement: z.string().optional(),
  zoneId: z.string().cuid().optional(),
});

export const createOrderSchema = z
  .object({
    type: z.enum(['DELIVERY', 'PICKUP']),
    paymentMethod: z.enum(['PIX', 'CARD', 'CASH_ON_DELIVERY', 'CARD_ON_DELIVERY']),
    items: z.array(orderItemSchema).min(1),
    delivery: deliveryInfoSchema.optional(),
  })
  .refine((data) => data.type === 'PICKUP' || (data.type === 'DELIVERY' && data.delivery), {
    message: 'Endereço de entrega é obrigatório para delivery.',
    path: ['delivery'],
  });

export const updateStatusSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PICKED_UP',
    'CANCELLED',
  ]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
