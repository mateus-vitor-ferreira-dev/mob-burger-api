import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  seed: {
    run: 'tsx --env-file=.env prisma/seed.ts',
  },
});
