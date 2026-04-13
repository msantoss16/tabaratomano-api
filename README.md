# TabaratoMano API & Scraper

Este repositório contém o backend (API) e o serviço de web scraping para o projeto **TabaratoMano**. É uma infraestrutura baseada em um monorepo que gerencia deals, cupons, categorias e conteúdo de blog para um agregador de ofertas. Basicamente é a API do www.tabaratomano.com.br acessada pelo subdominio api.tabaratomano.com.br

## Estrutura do Projeto

O projeto utiliza **npm workspaces** e está dividido da seguinte forma:

- `apps/api`: Servidor principal em Fastify que expõe a API REST.
- `apps/scraper`: Microserviço em Fastify que utiliza Playwright para extrair dados de produtos de diversas lojas.
- `packages/database`: Pacote compartilhado que contém o esquema do Prisma e o cliente do banco de dados.

## Tecnologias Utilizadas

- **Runtime:** Node.js v20+
- **Linguagem:** TypeScript
- **Framework Web:** Fastify
- **ORM:** Prisma
- **Banco de Dados:** PostgreSQL
- **Scraping:** Playwright + Playwright-Extra
- **Containerização:** Docker & Docker Compose

## Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
- Um arquivo `.env` configurado (veja `.env.example`)

## Como Começar

### 1. Configuração do Ambiente

Clone o repositório e instale as dependências:

```bash
npm install
```

Crie o seu arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Preencha as variáveis necessárias no `.env`:

- `DATABASE_URL`: URL de conexão com o PostgreSQL (se estiver usando Docker, o valor padrão pode ser algo como `postgresql://root:root@localhost:5432/tabaratomano`)
- `PORT`: Porta para a API (padrão: 3000)
- `SCRAPER_PORT`: Porta para o Scraper (padrão: 3001)
- `JWT_SECRET`: Chave secreta para tokens de autenticação.

### 2. Banco de Dados

Se estiver usando Docker, você pode subir o banco de dados separadamente ou usar o comando de desenvolvimento. Para gerar o cliente do Prisma e sincronizar o banco:

```bash
npm run db:generate
npm run db:push
```

### 3. Executando Localmente (Desenvolvimento)

Para rodar os serviços em modo de observação (watch mode):

**API:**

```bash
npm run dev:api
```

**Scraper:**

```bash
npm run dev:scraper
```

### 4. Executando com Docker

Para subir toda a infraestrutura (BD, API, Scraper) de uma vez:

```bash
docker compose up -d
```

## Autenticação e Admin

A API possui rotas protegidas que exigem um token Bearer. Para criar o primeiro usuário administrador, você pode usar o script utilitário:

```bash
cd apps/api
npx tsx src/scripts/create-admin.ts seu-email@exemplo.com sua-senha
```

## Documentação da API

Quando o servidor da API estiver rodando, você pode acessar a documentação interativa (Swagger) em:

`http://localhost:3000/documentation`

## Endpoints do Scraper

O serviço de scraper expõe um endpoint principal:

- `POST /scrape`: Recebe um corpo JSON `{ "url": "..." }` e retorna os dados extraídos do produto.

---

Feito por [TabaratoMano](https://tabaratomano.com.br)
