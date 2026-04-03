FROM node:20-alpine

WORKDIR /app

# Copia apenas dependências (melhora cache)
COPY package*.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Instala deps
RUN npm install

# Copia código
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Gera Prisma Client
WORKDIR /app/packages/database
RUN npx prisma generate

# Build da API (TypeScript)
WORKDIR /app/apps/api
RUN npm run build

# Porta da API
EXPOSE 3000

# Start com migration (produção)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]