import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertProduct(data: {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}) {
  const existing = await prisma.product.findFirst({ where: { name: data.name } });
  if (existing) {
    return prisma.product.update({ where: { id: existing.id }, data });
  }
  return prisma.product.create({ data });
}

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

  const catBurgers = await prisma.category.upsert({
    where: { slug: 'burgers' },
    update: { name: 'Burgers', position: 1 },
    create: { name: 'Burgers', slug: 'burgers', position: 1 },
  });

  const catChicken = await prisma.category.upsert({
    where: { slug: 'chicken' },
    update: {},
    create: { name: 'Chicken', slug: 'chicken', position: 2 },
  });

  const catCombos = await prisma.category.upsert({
    where: { slug: 'combos' },
    update: { position: 3 },
    create: { name: 'Combos', slug: 'combos', position: 3 },
  });

  const catBebidas = await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: { position: 4 },
    create: { name: 'Bebidas', slug: 'bebidas', position: 4 },
  });

  const catSobremesas = await prisma.category.upsert({
    where: { slug: 'sobremesas' },
    update: {},
    create: { name: 'Sobremesas', slug: 'sobremesas', position: 5 },
  });

  await prisma.category.upsert({
    where: { slug: 'porcoes' },
    update: { position: 6 },
    create: { name: 'Porções', slug: 'porcoes', position: 6 },
  });

  // ─── Smash Burgers ────────────────────────────────────────────────────────────

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Classic',
    description: 'Blend bovino 110g, cheddar/mussarela e molho especial da casa.',
    price: 22.9,
    imageUrl: '/burgers/mob-classic.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Bacon',
    description: 'Blend bovino 110g, bacon defumado crocante em tiras, dupla fatia cheddar/mussarela e molho especial.',
    price: 27.9,
    imageUrl: '/burgers/mob-bacon.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Godfather',
    description: 'Duplo blend 110g, bacon defumado crocante, ovo frito, dupla fatia cheddar/mussarela e molho especial.',
    price: 39.9,
    imageUrl: '/burgers/mob-godfather.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Sunrise',
    description: 'Blend bovino 110g, ovo frito, presunto, queijo mussarela/cheddar e molho especial.',
    price: 26.9,
    imageUrl: '/burgers/mob-sunrise.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Duplo Bacon BBQ',
    description: 'Duplo blend 110g, bacon defumado crocante em tiras, duplo queijo mussarela/cheddar e molho BBQ.',
    price: 37.9,
    imageUrl: '/burgers/mob-chaos.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Salad',
    description: 'Blend bovino 110g, duplo queijo mussarela/cheddar, alface, tomate e molho da casa.',
    price: 26.9,
    imageUrl: '/burgers/mob-deli.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Italian',
    description: 'Blend bovino 110g, queijo mussarela e cheddar, presunto e molho especial.',
    price: 27.9,
    imageUrl: '/burgers/mob-italian.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Brunch',
    description: 'Blend bovino 110g, ovo frito, presunto, duplo queijo mussarela/cheddar e molho especial.',
    price: 29.9,
    imageUrl: '/burgers/mob-brunch.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob King',
    description: 'Duplo blend 110g, ovo frito, bacon defumado crocante, dupla fatia cheddar/mussarela, molho especial e alface.',
    price: 39.9,
    imageUrl: '/burgers/mob-king.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Street',
    description: 'Blend bovino 110g, queijo mussarela/cheddar, alface, tomate e molho especial.',
    price: 24.9,
    imageUrl: '/burgers/mob-street.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Beast',
    description: 'Duplo blend 110g, bacon defumado crocante, ovo frito, dupla fatia cheddar/mussarela, presunto, alface, tomate e molho especial. O monstro.',
    price: 44.9,
    imageUrl: '/burgers/mob-beast.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Joker',
    description: 'Blend bovino 110g, bacon defumado crocante em tiras, queijo mussarela/cheddar, alface e molho especial. Imprevisível.',
    price: 27.9,
    imageUrl: '/burgers/mob-joker.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Original',
    description: 'Simplismo elevado. Blend, bacon, cheddar, alface, tomate e molho especial.',
    price: 26,
    imageUrl: '/burgers/mob-original.png',
  });

  await upsertProduct({
    categoryId: catBurgers.id,
    name: 'Mob Full',
    description: 'Duplo blend, bacon, ovo, presunto, cheddar, mussarela, alface, tomate e molho. Tudo.',
    price: 48,
    imageUrl: '/burgers/mob-full.png',
  });

  // ─── Chicken ─────────────────────────────────────────────────────────────────

  await upsertProduct({
    categoryId: catChicken.id,
    name: 'Mob Chicken',
    description: 'Frango grelhado na chapa, mussarela, alface, tomate e molho especial da casa.',
    price: 27,
    imageUrl: '/burgers/mob-chicken.png',
  });

  await upsertProduct({
    categoryId: catChicken.id,
    name: 'Mob Chicken Bacon',
    description: 'Frango grelhado com tiras de bacon, cheddar e alface. Combinação poderosa.',
    price: 32,
    imageUrl: '/burgers/mob-chicken-bacon.png',
  });

  await upsertProduct({
    categoryId: catChicken.id,
    name: 'Mob Chicken Sunrise',
    description: 'Frango grelhado com ovo frito, presunto, cheddar e molho especial. O sol nasceu no pão.',
    price: 31,
    imageUrl: '/burgers/mob-chicken-sunrise.png',
  });

  await upsertProduct({
    categoryId: catChicken.id,
    name: 'Mob Chicken Full',
    description: 'Frango grelhado, bacon, ovo, presunto, cheddar, alface, tomate e molho especial. Tudo no frango.',
    price: 40,
    imageUrl: '/burgers/mob-chicken-full.png',
  });

  // ─── Combos ──────────────────────────────────────────────────────────────────

  await upsertProduct({
    categoryId: catCombos.id,
    name: 'Mob Combo Clássico',
    description: 'Mob Classic + Bebida lata. Economia de R$ 3.',
    price: 38,
    imageUrl: '/burgers/combo-mob-combo-classico.png',
  });

  await upsertProduct({
    categoryId: catCombos.id,
    name: 'Mob Combo Premium',
    description: 'Qualquer burger (B-01 a B-12) + Bebida lata + 1 Sobremesa. Economia de R$ 5.',
    price: 55,
    imageUrl: '/burgers/combo-mob-combo-premium.png',
  });

  await upsertProduct({
    categoryId: catCombos.id,
    name: 'Mob Combo Sweet',
    description: 'Mob Original + Bebida lata + 1 Cookie. Economia de R$ 4.',
    price: 44,
    imageUrl: '/burgers/combo-mob-combo-sweet.png',
  });

  await upsertProduct({
    categoryId: catCombos.id,
    name: 'Mob Para 2',
    description: '2 Burgers à escolha + 2 Bebidas lata + 1 Sobremesa compartilhada. Economia de R$ 8.',
    price: 78,
    imageUrl: '/burgers/combo-mob-para-2.png',
  });

  await upsertProduct({
    categoryId: catCombos.id,
    name: 'Mob Família',
    description: '4 Burgers à escolha + 4 Bebidas lata + 2 Sobremesas. Economia de R$ 18.',
    price: 148,
    imageUrl: '/burgers/combo-mob-familia.png',
  });

  // ─── Bebidas ─────────────────────────────────────────────────────────────────

  await upsertProduct({
    categoryId: catBebidas.id,
    name: 'Coca-Cola',
    description: 'Lata 350ml gelada.',
    price: 7,
    imageUrl: '/burgers/coca-cola.png',
  });

  await upsertProduct({
    categoryId: catBebidas.id,
    name: 'Coca-Cola Zero',
    description: 'Lata 350ml gelada.',
    price: 7,
    imageUrl: '/burgers/coca-cola-zero.png',
  });

  await upsertProduct({
    categoryId: catBebidas.id,
    name: 'Guaraná',
    description: 'Lata 350ml gelada.',
    price: 6,
    imageUrl: '/burgers/guarana.png',
  });

  await upsertProduct({
    categoryId: catBebidas.id,
    name: 'Guaraná Zero',
    description: 'Lata 350ml gelada.',
    price: 6,
    imageUrl: '/burgers/guarana-zero.png',
  });

  // ─── Sobremesas ──────────────────────────────────────────────────────────────

  await upsertProduct({
    categoryId: catSobremesas.id,
    name: 'Mob Bombom de Morango',
    description: 'Bombom artesanal de morango.',
    price: 8,
    imageUrl: '/burgers/sobremesa-mob-bombom-de-morango.png',
  });

  await upsertProduct({
    categoryId: catSobremesas.id,
    name: 'Mob Brownie',
    description: 'Ninho · Nutella · Bis · KitKat · Confete.',
    price: 12,
    imageUrl: '/burgers/sobremesa-mob-brownie.png',
  });

  await upsertProduct({
    categoryId: catSobremesas.id,
    name: 'Mob Cookie',
    description: 'Cookie clássico artesanal.',
    price: 7,
    imageUrl: '/burgers/sobremesa-mob-cookie.png',
  });

  await upsertProduct({
    categoryId: catSobremesas.id,
    name: 'Mob Cookie Nutella',
    description: 'Cookie recheado com Nutella.',
    price: 10,
    imageUrl: '/burgers/sobremesa-mob-cookie-nutella.png',
  });

  // ─── Porções ─────────────────────────────────────────────────────────────────

  const catPorcoes = await prisma.category.findFirst({ where: { slug: 'porcoes' } });
  if (catPorcoes) {
    await upsertProduct({
      categoryId: catPorcoes.id,
      name: 'Batata Frita 200g',
      description: 'Batata frita crocante 200g com sal.',
      price: 14,
      imageUrl: '/burgers/batata-frita.png',
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
  console.log(`  Categorias: 6  |  Produtos: ${totalProdutos}  |  Zonas: ${totalZonas}`);
  console.log('');
  console.log('  Cardápio:');
  console.log('    14 Smash Burgers · 4 Chicken · 5 Combos · 4 Bebidas · 4 Sobremesas');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
