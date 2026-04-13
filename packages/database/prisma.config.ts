import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://root:rootpassword@localhost:5432/tabaratomano?schema=public',
  },
});
