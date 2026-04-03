import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Evita múltiplas instâncias no modo de desenvolvimento
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL || 'postgresql://root:rootpassword@localhost:5432/tabaratomano?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
