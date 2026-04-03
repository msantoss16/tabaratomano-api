import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// @ts-ignore: Mismatch type between @types/pg versions 
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
