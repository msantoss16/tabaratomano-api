FROM node:20.19-alpine

WORKDIR /app

# Copia apenas dependências (melhora cache)
COPY package*.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Instala deps
RUN npm install

# Copia código
COPY tsconfig.json ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Gera Prisma Client
WORKDIR /app/packages/database
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Build do database package
RUN npx tsc

# Build da API (TypeScript)
WORKDIR /app/apps/api
RUN npm run build

# Porta da API
EXPOSE 3000

# Start com migration (produção)
WORKDIR /app/packages/database
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && cd /app/apps/api && node dist/server.js"]