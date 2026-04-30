/**
 * bootstrap-session.ts
 *
 * Script de uso LOCAL (não roda no servidor).
 * Abre o Mercado Livre em modo visível para você fazer login manualmente.
 * Quando confirmar, salva a sessão em storage/mercadolivre-session.json.
 *
 * Uso:
 *   npx tsx scripts/bootstrap-session.ts
 *
 * Depois de gerar o arquivo, envie para o servidor:
 *   scp storage/mercadolivre-session.json user@servidor:/opt/tabaratomano/storage/
 */

import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

chromium.use(stealth());

// ── Caminhos ──────────────────────────────────────────────────────────────────

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const SESSION_FILE = path.join(STORAGE_DIR, 'mercadolivre-session.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

function backupExistingSession(): void {
  if (!fs.existsSync(SESSION_FILE)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(STORAGE_DIR, `mercadolivre-session.backup-${ts}.json`);
  fs.copyFileSync(SESSION_FILE, backupPath);
  console.log(`\n♻️  Sessão anterior salva como backup: ${path.basename(backupPath)}`);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

export async function bootstrapMercadoLivreSession(): Promise<void> {
  // Garante que o diretório existe
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Faz backup da sessão existente antes de sobrescrever
  backupExistingSession();

  console.log('\n🌐 Abrindo browser em modo visível...');
  console.log('   Aguarde o Mercado Livre carregar e faça login normalmente.\n');

  const browser = await chromium.launch({
    headless: false, // visível para login manual
    args: [
      '--lang=pt-BR',
      '--window-size=1280,900',
    ],
  });

  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Navega para a página de login diretamente
  await page.goto(
    'https://www.mercadolivre.com.br/jms/mlb/lgz/msl/login.htm?platform_id=ML&loginType=explicit',
    { waitUntil: 'domcontentloaded' },
  );

  // Espera o usuário fazer login e confirmar
  await waitForEnter(
    '\n🔑 Faça login no browser. Quando terminar e estiver na página principal, pressione ENTER aqui: ',
  );

  // Verifica se o login foi bem-sucedido olhando a URL atual
  const currentUrl = page.url();
  if (currentUrl.includes('/lgz/') || currentUrl.includes('/login')) {
    console.log('\n⚠️  Parece que o login não foi concluído (ainda está na página de login).');
    const confirm = await new Promise<string>((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('   Continuar mesmo assim? (s/N): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase());
      });
    });
    if (confirm !== 's') {
      console.log('❌ Bootstrap cancelado.');
      await browser.close();
      return;
    }
  }

  // Salva a sessão
  console.log('\n💾 Salvando sessão...');
  await context.storageState({ path: SESSION_FILE });
  console.log(`✅ Sessão salva em: ${SESSION_FILE}`);

  await browser.close();

  // Instrução de como enviar para o servidor
  console.log('\n' + '─'.repeat(60));
  console.log('📤 Para usar no servidor, envie o arquivo:');
  console.log('');
  console.log('   scp storage/mercadolivre-session.json \\');
  console.log('       usuario@seu-servidor:/opt/tabaratomano/storage/mercadolivre-session.json');
  console.log('');
  console.log('   Depois reinicie o container do scraper:');
  console.log('   docker compose restart scraper');
  console.log('─'.repeat(60) + '\n');
}

// Executa se chamado diretamente
bootstrapMercadoLivreSession().catch((err) => {
  console.error('❌ Erro no bootstrap:', err);
  process.exit(1);
});
