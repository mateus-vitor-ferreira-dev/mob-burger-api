import prisma from '../../config/prisma.js';
import { invalidateMenuCache } from '../menu/menu.service.js';

// ─── Ingredientes ─────────────────────────────────────────────────────────────

export async function listIngredients() {
  return prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    include: {
      productIngredients: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function createIngredient(data: {
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}) {
  return prisma.ingredient.create({ data });
}

export async function updateIngredient(
  id: string,
  data: Partial<{ name: string; unit: string; quantity: number; minQuantity: number }>,
) {
  const ingredient = await prisma.ingredient.update({
    where: { id },
    data,
    include: { productIngredients: true },
  });

  if ('quantity' in data) {
    await recomputeInStock(ingredient.productIngredients.map((pi) => pi.productId));
  }

  return ingredient;
}

export async function deleteIngredient(id: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: { productIngredients: true },
  });
  const productIds = ingredient?.productIngredients.map((pi) => pi.productId) ?? [];
  await prisma.ingredient.delete({ where: { id } });
  // Produtos que tinham esse ingrediente podem voltar ao estoque se for o único
  if (productIds.length) await recomputeInStock(productIds);
}

// ─── Fichas técnicas (produto → ingredientes) ─────────────────────────────────

export async function getProductIngredients(productId: string) {
  return prisma.productIngredient.findMany({
    where: { productId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: 'asc' } },
  });
}

export async function setProductIngredients(
  productId: string,
  ingredients: { ingredientId: string; quantity: number }[],
) {
  await prisma.productIngredient.deleteMany({ where: { productId } });
  if (ingredients.length > 0) {
    await prisma.productIngredient.createMany({
      data: ingredients.map((i) => ({ productId, ...i })),
    });
  }
  await recomputeInStock([productId]);
}

// ─── Desconto de estoque ao confirmar pedido ──────────────────────────────────

export async function deductStockForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: { ingredients: { include: { ingredient: true } } },
          },
        },
      },
    },
  });
  if (!order) return;

  const deductions = new Map<string, number>();
  const affectedProductIds = new Set<string>();

  for (const item of order.items) {
    affectedProductIds.add(item.productId);
    for (const pi of item.product.ingredients) {
      const prev = deductions.get(pi.ingredientId) ?? 0;
      deductions.set(pi.ingredientId, prev + pi.quantity * item.quantity);
    }
  }

  if (deductions.size === 0) return;

  await Promise.all(
    Array.from(deductions.entries()).map(([ingredientId, qty]) =>
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { quantity: { decrement: qty } },
      }),
    ),
  );

  await recomputeInStock(Array.from(affectedProductIds));
}

// ─── Recalcula inStock para uma lista de produtos ─────────────────────────────

async function recomputeInStock(productIds: string[]) {
  if (productIds.length === 0) return;

  for (const productId of productIds) {
    const mappings = await prisma.productIngredient.findMany({
      where: { productId },
      include: { ingredient: true },
    });

    // Sem ficha técnica = sempre em estoque (controle não gerenciado)
    if (mappings.length === 0) continue;

    const inStock = mappings.every((m) => m.ingredient.quantity >= m.quantity);
    await prisma.product.update({ where: { id: productId }, data: { inStock } });
  }

  invalidateMenuCache();
}
