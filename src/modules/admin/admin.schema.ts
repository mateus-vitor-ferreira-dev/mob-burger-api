import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullish(),
  price: z.number().positive(),
  imageUrl: z.string().min(1).nullish(),
  active: z.boolean().default(true),
});

export const productOptionSchema = z.object({
  label: z.string().min(2).max(100),
  type: z.enum(['CHECKBOX', 'RADIO']),
  required: z.boolean().default(false),
});

export const optionItemSchema = z.object({
  name: z.string().min(1).max(100),
  additionalPrice: z.number().min(0).default(0),
});

export const deliveryZoneSchema = z.object({
  name: z.string().min(2),
  fee: z.number().min(0),
  active: z.boolean().default(true),
});

export const storeConfigSchema = z.object({
  isOpen: z.boolean(),
  openingHours: z.record(
    z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean().default(false),
    }),
  ),
  whatsappNumber: z.string().optional(),
  hideOutOfStock: z.boolean().optional(),
});

export const globalExtraSchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().min(0),
  imageUrl: z.string().min(1).nullish(),
  active: z.boolean().default(true),
});

export const comboConfigSchema = z.object({
  numBurgers: z.number().int().min(1).max(8),
  numDrinks: z.number().int().min(0).max(8),
  drinkCostPrice: z.number().min(0),
  allowedSlugs: z.array(z.string().min(1)).min(1),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductOptionInput = z.infer<typeof productOptionSchema>;
export type OptionItemInput = z.infer<typeof optionItemSchema>;
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
export type StoreConfigInput = z.infer<typeof storeConfigSchema>;
export type GlobalExtraInput = z.infer<typeof globalExtraSchema>;
export type ComboConfigInput = z.infer<typeof comboConfigSchema>;
