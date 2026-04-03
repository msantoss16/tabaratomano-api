FROM mcr.microsoft.com/playwright:v1.42.1-jammy

WORKDIR /app

# Copia dependências primeiro (cache)
COPY package*.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/scraper/package.json ./apps/scraper/

# Instala deps
RUN npm install

# Copia código
COPY packages/database ./packages/database
COPY apps/scraper ./apps/scraper

# Prisma
WORKDIR /app/packages/database
RUN npx prisma generate

# Build do scraper (TypeScript)
WORKDIR /app/apps/scraper
RUN npm run build

# Porta do scraper (API HTTP)
EXPOSE 3001

# Start
CMD ["node", "dist/server.js"]