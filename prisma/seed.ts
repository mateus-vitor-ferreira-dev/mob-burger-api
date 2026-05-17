import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed da Mob Burger...');

  // Admin
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'murilo@mobburger.com.br' },
    update: {},
    create: { email: 'murilo@mobburger.com.br', passwordHash, role: 'ADMIN' },
  });

  // Categorias
  const burgers = await prisma.category.upsert({
    where: { slug: 'burgers' },
    update: {},
    create: { name: 'Burgers', slug: 'burgers', position: 1 },
  });

  const combos = await prisma.category.upsert({
    where: { slug: 'combos' },
    update: {},
    create: { name: 'Combos', slug: 'combos', position: 2 },
  });

  const bebidas = await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: {},
    create: { name: 'Bebidas', slug: 'bebidas', position: 3 },
  });

  // Produtos
  const classic = await prisma.product.create({
    data: {
      categoryId: burgers.id,
      name: 'Mob Classic',
      description: 'Blend artesanal 180g, queijo cheddar, alface, tomate, maionese da casa.',
      price: 28.9,
    },
  });

  await prisma.product.create({
    data: {
      categoryId: burgers.id,
      name: 'Mob Smash',
      description: 'Dois smash patties 90g, queijo americano duplo, pickles, mostarda e ketchup.',
      price: 32.9,
    },
  });

  await prisma.product.create({
    data: {
      categoryId: combos.id,
      name: 'Combo Mob Classic',
      description: 'Mob Classic + Fritas M + Refrigerante 350ml.',
      price: 42.9,
    },
  });

  await prisma.product.create({
    data: {
      categoryId: bebidas.id,
      name: 'Refrigerante Lata',
      description: 'Coca-Cola, Guaraná ou Sprite — 350ml.',
      price: 6.0,
    },
  });

  // Opções do Mob Classic
  const ponto = await prisma.productOption.create({
    data: {
      productId: classic.id,
      label: 'Ponto da carne',
      type: 'RADIO',
      required: true,
    },
  });

  await prisma.optionItem.createMany({
    data: [
      { optionId: ponto.id, name: 'Mal passado', additionalPrice: 0 },
      { optionId: ponto.id, name: 'Ao ponto', additionalPrice: 0 },
      { optionId: ponto.id, name: 'Bem passado', additionalPrice: 0 },
    ],
  });

  const adicionais = await prisma.productOption.create({
    data: {
      productId: classic.id,
      label: 'Adicionais',
      type: 'CHECKBOX',
      required: false,
    },
  });

  await prisma.optionItem.createMany({
    data: [
      { optionId: adicionais.id, name: 'Bacon', additionalPrice: 4.0 },
      { optionId: adicionais.id, name: 'Ovo frito', additionalPrice: 3.0 },
      { optionId: adicionais.id, name: 'Queijo extra', additionalPrice: 2.5 },
    ],
  });

  // Zonas de entrega
  await prisma.deliveryZone.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Centro', fee: 5.0 },
      { name: 'Bairro São Vicente', fee: 7.0 },
      { name: 'Bairro Jardim Panorama', fee: 8.0 },
      { name: 'Bairro Rui Barbosa', fee: 6.0 },
    ],
  });

  // Config da loja
  await prisma.storeConfig.create({
    data: {
      isOpen: true,
      whatsappNumber: '35999999999',
      openingHours: {
        seg: { open: '18:00', close: '23:00', closed: false },
        ter: { open: '18:00', close: '23:00', closed: false },
        qua: { open: '18:00', close: '23:00', closed: false },
        qui: { open: '18:00', close: '23:00', closed: false },
        sex: { open: '18:00', close: '00:00', closed: false },
        sab: { open: '12:00', close: '00:00', closed: false },
        dom: { open: '12:00', close: '22:00', closed: false },
      },
    },
  });

  console.log('✅ Seed concluído!');
  console.log('📧 Admin: murilo@mobburger.com.br');
  console.log('🔑 Senha: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
