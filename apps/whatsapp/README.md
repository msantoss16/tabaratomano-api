# 📱 Tabaratomano WhatsApp Bot

Este é o serviço de integração com o WhatsApp para o projeto Tabaratomano. Ele atua como um worker que consome mensagens de uma fila e as envia para grupos específicos configurados.

## 🛠️ Tecnologias
- **[Baileys](https://github.com/WhiskeySockets/Baileys)**: Biblioteca para conexão com o WhatsApp WPWeb API.
- **BullMQ**: Sistema de filas robusto baseado em Redis.
- **Fastify & Axios**: Comunicação com a API principal.
- **TypeScript**: Linguagem base para desenvolvimento seguro.

## 🚀 Funcionalidades
- **Conexão via QR Code**: Exibe o QR Code diretamente nos logs do container para pareamento.
- **Persistência de Sessão**: Armazena as credenciais de autenticação de forma persistente.
- **Processamento de Fila**: Consome jobs do tipo `messages` via Redis.
- **Envio Multi-Mídia**: Suporte para envio de mensagens com ou sem imagem.
- **Atualização de Status**: Reporta o sucesso ou falha do envio de volta para a API principal.
- **Rate Limiting**: Limita o envio de mensagens para evitar banimentos (atualmente 1 mensagem a cada 3 segundos).

## ⚙️ Variáveis de Ambiente
O serviço depende das seguintes variáveis:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `API_URL` | URL base da API principal para atualizar status | `http://api:3000` |
| `REDIS_URL` | Conexão com o servidor Redis | `redis://redis:6379` |
| `WHATSAPP_GROUP_JIDS` | IDs dos grupos separados por vírgula | `12345@g.us,67890@g.us` |
| `WHATSAPP_AUTH_FOLDER` | Pasta para salvar a sessão (opcional) | `./auth_info_baileys` |

## 📦 Como Rodar

### Via Docker (Recomendado)
O serviço já está configurado no `docker-compose.yml` da raiz do projeto.
```bash
docker-compose up -d whatsapp
```

### Desenvolvimento Local
1. Instale as dependências na pasta raiz ou na pasta do app:
   ```bash
   npm install
   ```
2. Configure o arquivo `.env` com as variáveis acima.
3. Inicie o serviço em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🔐 Autenticação
Ao iniciar o serviço pela primeira vez (ou se a sessão expirar), acompanhe os logs para escanear o QR Code:
```bash
docker logs -f tabaratomano-whatsapp
```
Após o scaneamento, as credenciais serão salvas na pasta configurada (no Docker, isso é mapeado para um volume persistente).

## 🔍 Listagem de Grupos
Para obter os IDs (JIDs) dos grupos que o bot participa, utilize o script de listagem. Isso é essencial para preencher a variável `WHATSAPP_GROUP_JIDS`.

### Como rodar
**Via Docker (recomendado):**
```bash
docker exec -it tabaratomano-whatsapp npm run list-groups
```

**Localmente:**
```bash
npm run list-groups
```
O script irá conectar ao WhatsApp e listar todos os grupos no console. Copie os JIDs desejados (ex: `123456789@g.us`) e adicione-os ao seu arquivo `.env`.

## 📁 Estrutura de Pastas
- `src/whatsapp.ts`: Core da conexão e logs do QR Code.
- `src/queue.ts`: Worker BullMQ que processa a fila do Redis.
- `src/sender.ts`: Lógica de formatação e envio das mensagens.
- `auth_info_baileys/`: Onde residem os arquivos de sessão (não versionado).
