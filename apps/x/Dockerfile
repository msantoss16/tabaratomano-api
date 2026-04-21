FROM node:20.19-alpine

WORKDIR /app

# Copia pacotes necessários
COPY package*.json ./
COPY apps/x/package.json ./apps/x/

# Instala dependências
RUN npm install

# Copia código
COPY tsconfig.json ./
COPY apps/x ./apps/x

# Build
WORKDIR /app/apps/x
RUN npm run build

CMD ["npm", "start"]
