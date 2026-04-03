FROM mcr.microsoft.com/playwright:v1.42.1-jammy

WORKDIR /app

# ATUALIZA NODE PRA VERSÃO COMPATÍVEL COM PRISMA
RUN apt-get update && apt-get install -y curl \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && node -v

# Copia dependências
COPY package*.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/scraper/package.json ./apps/scraper/

RUN npm install

# Copia código
COPY tsconfig.json ./
COPY packages/database ./packages/database
COPY apps/scraper ./apps/scraper

# Prisma
WORKDIR /app/packages/database
RUN npx prisma generate

# Build do database package
RUN npx tsc

# Build
WORKDIR /app/apps/scraper
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/server.js"]