import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx create-admin.ts <email> <password>');
    process.exit(1);
  }

  const email = args[0] as string;
  const password = args[1] as string;

  try {
    const existing = await prisma.admin.findUnique({ where: { email } });
    
    if (existing) {
      console.error(`Admin with email ${email} already exists.`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    console.log(`\nSuccess! Admin created:`);
    console.log(`ID: ${admin.id}`);
    console.log(`Email: ${admin.email}\n`);
    console.log(`Now you can login with this email and your password.`);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
