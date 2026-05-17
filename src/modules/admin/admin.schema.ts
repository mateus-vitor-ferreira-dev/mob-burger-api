import { z } from 'zod';

export const productSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const deliveryZoneSchema = z.object({
  name: z.string().min(2),
  fee: z.number().min(0),
  active: z.boolean().default(true),
});

export const storeConfigSchema = z.object({
  isOpen: z.boolean(),
  openingHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().default(false),
  })),
  whatsappNumber: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
export type StoreConfigInput = z.infer<typeof storeConfigSchema>;
