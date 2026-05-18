import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed da Mob Burger...');

  // ─── Usuários (staff) ────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'murilo@mobburger.com.br' },
    update: {},
    create: { email: 'murilo@mobburger.com.br', passwordHash: adminHash, role: 'ADMIN' },
  });

  const attendantHash = await bcrypt.hash('atendente123', 12);
  await prisma.user.upsert({
    where: { email: 'atendente@mobburger.com.br' },
    update: {},
    create: { email: 'atendente@mobburger.com.br', passwordHash: attendantHash, role: 'ATTENDANT' },
  });

  // ─── Categorias ───────────────────────────────────────────────────────────────

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

  const porcoes = await prisma.category.upsert({
    where: { slug: 'porcoes' },
    update: {},
    create: { name: 'Porções', slug: 'porcoes', position: 3 },
  });

  const bebidas = await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: {},
    create: { name: 'Bebidas', slug: 'bebidas', position: 4 },
  });

  // ─── Produtos (só cria se não existir) ────────────────────────────────────────

  const mobClassic = await prisma.product.findFirst({ where: { name: 'Mob Classic' } })
    ?? await prisma.product.create({
      data: {
        categoryId: burgers.id,
        name: 'Mob Classic',
        description: 'Blend artesanal 180g, queijo cheddar, alface, tomate, maionese da casa.',
        price: 28.9,
      },
    });

  const mobSmash = await prisma.product.findFirst({ where: { name: 'Mob Smash' } })
    ?? await prisma.product.create({
      data: {
        categoryId: burgers.id,
        name: 'Mob Smash',
        description: 'Dois smash patties 90g, queijo americano duplo, pickles, mostarda e ketchup.',
        price: 32.9,
      },
    });

  const mobBacon = await prisma.product.findFirst({ where: { name: 'Mob Bacon' } })
    ?? await prisma.product.create({
      data: {
        categoryId: burgers.id,
        name: 'Mob Bacon',
        description: 'Blend 180g, bacon crocante, cheddar cremoso, cebola caramelizada.',
        price: 34.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Combo Mob Classic' } })
    ?? await prisma.product.create({
      data: {
        categoryId: combos.id,
        name: 'Combo Mob Classic',
        description: 'Mob Classic + Fritas M + Refrigerante 350ml.',
        price: 42.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Combo Mob Smash' } })
    ?? await prisma.product.create({
      data: {
        categoryId: combos.id,
        name: 'Combo Mob Smash',
        description: 'Mob Smash + Fritas M + Refrigerante 350ml.',
        price: 46.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Fritas P' } })
    ?? await prisma.product.create({
      data: {
        categoryId: porcoes.id,
        name: 'Fritas P',
        description: 'Porção pequena de batatas fritas crocantes.',
        price: 10.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Fritas G' } })
    ?? await prisma.product.create({
      data: {
        categoryId: porcoes.id,
        name: 'Fritas G',
        description: 'Porção grande de batatas fritas crocantes.',
        price: 16.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Onion Rings' } })
    ?? await prisma.product.create({
      data: {
        categoryId: porcoes.id,
        name: 'Onion Rings',
        description: 'Anéis de cebola empanados e crocantes.',
        price: 18.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Refrigerante Lata' } })
    ?? await prisma.product.create({
      data: {
        categoryId: bebidas.id,
        name: 'Refrigerante Lata',
        description: 'Coca-Cola, Guaraná ou Sprite — 350ml.',
        price: 6.0,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Suco Natural' } })
    ?? await prisma.product.create({
      data: {
        categoryId: bebidas.id,
        name: 'Suco Natural',
        description: 'Laranja, limão ou maracujá — 400ml.',
        price: 9.9,
      },
    });

  await prisma.product.findFirst({ where: { name: 'Água Mineral' } })
    ?? await prisma.product.create({
      data: {
        categoryId: bebidas.id,
        name: 'Água Mineral',
        description: 'Com ou sem gás — 500ml.',
        price: 4.0,
      },
    });

  // ─── Opções do Mob Classic ─────────────────────────────────────────────────

  const classicTemOpcoes = await prisma.productOption.count({ where: { productId: mobClassic.id } });

  if (classicTemOpcoes === 0) {
    const ponto = await prisma.productOption.create({
      data: { productId: mobClassic.id, label: 'Ponto da carne', type: 'RADIO', required: true },
    });
    await prisma.optionItem.createMany({
      data: [
        { optionId: ponto.id, name: 'Mal passado', additionalPrice: 0 },
        { optionId: ponto.id, name: 'Ao ponto', additionalPrice: 0 },
        { optionId: ponto.id, name: 'Bem passado', additionalPrice: 0 },
      ],
    });

    const adicionais = await prisma.productOption.create({
      data: { productId: mobClassic.id, label: 'Adicionais', type: 'CHECKBOX', required: false },
    });
    await prisma.optionItem.createMany({
      data: [
        { optionId: adicionais.id, name: 'Bacon', additionalPrice: 4.0 },
        { optionId: adicionais.id, name: 'Ovo frito', additionalPrice: 3.0 },
        { optionId: adicionais.id, name: 'Queijo extra', additionalPrice: 2.5 },
        { optionId: adicionais.id, name: 'Cebola caramelizada', additionalPrice: 2.0 },
      ],
    });
  }

  // ─── Opções do Mob Smash ──────────────────────────────────────────────────

  const smashTemOpcoes = await prisma.productOption.count({ where: { productId: mobSmash.id } });

  if (smashTemOpcoes === 0) {
    const adicionaisSmash = await prisma.productOption.create({
      data: { productId: mobSmash.id, label: 'Adicionais', type: 'CHECKBOX', required: false },
    });
    await prisma.optionItem.createMany({
      data: [
        { optionId: adicionaisSmash.id, name: 'Bacon', additionalPrice: 4.0 },
        { optionId: adicionaisSmash.id, name: 'Queijo extra', additionalPrice: 2.5 },
        { optionId: adicionaisSmash.id, name: 'Jalapeño', additionalPrice: 1.5 },
      ],
    });
  }

  // ─── Opções do Mob Bacon ──────────────────────────────────────────────────

  const baconTemOpcoes = await prisma.productOption.count({ where: { productId: mobBacon.id } });

  if (baconTemOpcoes === 0) {
    const ponto = await prisma.productOption.create({
      data: { productId: mobBacon.id, label: 'Ponto da carne', type: 'RADIO', required: true },
    });
    await prisma.optionItem.createMany({
      data: [
        { optionId: ponto.id, name: 'Mal passado', additionalPrice: 0 },
        { optionId: ponto.id, name: 'Ao ponto', additionalPrice: 0 },
        { optionId: ponto.id, name: 'Bem passado', additionalPrice: 0 },
      ],
    });
  }

  // ─── Zonas de entrega ─────────────────────────────────────────────────────

  await prisma.deliveryZone.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Centro', fee: 5.0 },
      { name: 'Bairro São Vicente', fee: 7.0 },
      { name: 'Bairro Jardim Panorama', fee: 8.0 },
      { name: 'Bairro Rui Barbosa', fee: 6.0 },
      { name: 'Bairro Santa Cruz', fee: 9.0 },
    ],
  });

  // ─── Configuração da loja ─────────────────────────────────────────────────

  const configExistente = await prisma.storeConfig.findFirst();
  if (!configExistente) {
    await prisma.storeConfig.create({
      data: {
        isOpen: true,
        whatsappNumber: '5535999999999',
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
  }

  // ─── Resultado ───────────────────────────────────────────────────────────────

  const totalProdutos = await prisma.product.count();
  const totalZonas = await prisma.deliveryZone.count();

  console.log('Seed concluido!');
  console.log('');
  console.log('  Admin:      murilo@mobburger.com.br   / admin123');
  console.log('  Atendente:  atendente@mobburger.com.br / atendente123');
  console.log('');
  console.log(`  Categorias: 4  |  Produtos: ${totalProdutos}  |  Zonas: ${totalZonas}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
