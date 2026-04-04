import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authController = {
  login: async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as Record<string, string>;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    try {
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Assert request.server.jwt exists (decorated in server.ts)
      const token = (request.server as any).jwt.sign({ 
        id: admin.id, 
        email: admin.email,
        role: 'admin'
      });

      return reply.send({ token });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
};
