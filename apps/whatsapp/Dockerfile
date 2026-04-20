FROM node:20.19-alpine

WORKDIR /app

# Copia pacotes necessários
COPY package*.json ./
COPY apps/whatsapp/package.json ./apps/whatsapp/

# Instala dependências
RUN npm install

# Copia código
COPY tsconfig.json ./
COPY apps/whatsapp ./apps/whatsapp

# Build
WORKDIR /app/apps/whatsapp
RUN npm run build

# O volume pro Baileys state será mapeado aqui
VOLUME ["/app/apps/whatsapp/auth_info_baileys"]

CMD ["npm", "start"]
