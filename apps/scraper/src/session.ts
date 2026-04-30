/**
 * session.ts
 *
 * Gerencia o ciclo de vida do browser e da sessão autenticada do Mercado Livre.
 * A sessão é carregada de um arquivo JSON (storageState) gerado pelo script
 * bootstrap-session.ts rodado localmente.
 *
 * Arquitetura:
 *  - bootstrap (local) → salva mercadolivre-session.json
 *  - servidor carrega esse arquivo via storageState ao iniciar o context
 *  - context é singleton, reutilizado em todos os requests
 *  - cookies são atualizados no arquivo periodicamente (auto-save)
 */

import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

chromium.use(stealth());

// ── Caminhos ──────────────────────────────────────────────────────────────────

/**
 * Resolução do caminho da sessão:
 * - Via env var ML_SESSION_FILE (mais flexível para diferentes ambientes)
 * - Padrão: ../../storage/mercadolivre-session.json relativo ao CWD do processo
 *   Em Docker com WORKDIR=/app/apps/scraper → /app/storage/mercadolivre-session.json
 */
export const SESSION_FILE =
  process.env.ML_SESSION_FILE ||
  path.resolve(process.cwd(), 'storage/mercadolivre-session.json');

export const SCREENSHOT_DIR =
  process.env.ML_SCREENSHOT_DIR ||
  path.resolve(process.cwd(), '../../scraper-errors');

// ── Fingerprint / opções de contexto ─────────────────────────────────────────
// Simula um usuário brasileiro real no Windows com Chrome 124.

const CONTEXT_OPTIONS = {
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  viewport: { width: 1366, height: 768 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  extraHTTPHeaders: {
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  },
};

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--lang=pt-BR',
  '--window-size=1366,768',
];

// ── Singleton ─────────────────────────────────────────────────────────────────

let _browser: Browser | null = null;
let _context: BrowserContext | null = null;
let _sessionWarmed = false;
let _lastWarmTime = 0;
let _sessionInvalid = false; // flag: sessão precisa de renovação manual

const WARM_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos
// Salva a sessão a cada N minutos para capturar renovações de cookie
const SAVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

// ── Session file helpers ──────────────────────────────────────────────────────

/**
 * Retorna true se o arquivo de sessão existe em disco.
 */
export function hasSessionFile(): boolean {
  return fs.existsSync(SESSION_FILE);
}

/**
 * Carrega o conteúdo da sessão (para exibição de status).
 * Retorna o número de cookies e a data de modificação do arquivo.
 */
export function loadSessionInfo(): { cookieCount: number; modifiedAt: string | null } {
  if (!hasSessionFile()) return { cookieCount: 0, modifiedAt: null };
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const state = JSON.parse(raw);
    const stat = fs.statSync(SESSION_FILE);
    return {
      cookieCount: (state.cookies ?? []).length,
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch {
    return { cookieCount: 0, modifiedAt: null };
  }
}

/**
 * Salva o estado atual do context de volta ao arquivo, preservando os cookies
 * mais recentes obtidos durante a navegação.
 * Cria backup antes de sobrescrever.
 */
export async function saveSession(context: BrowserContext): Promise<void> {
  try {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Backup atômico: salva em .tmp e renomeia
    const tmpFile = `${SESSION_FILE}.tmp`;
    await context.storageState({ path: tmpFile });
    fs.renameSync(tmpFile, SESSION_FILE);
    console.log(`💾 [Session] Sessão atualizada em: ${SESSION_FILE}`);
  } catch (e) {
    console.warn('⚠️ [Session] Não foi possível salvar a sessão:', e);
  }
}

// ── Init / destroy ────────────────────────────────────────────────────────────

/**
 * Inicializa o browser e cria um contexto autenticado usando o storageState
 * salvo pelo bootstrap. Se não houver arquivo de sessão, o contexto é anônimo
 * (sem autenticação) e uma aviso é exibido.
 */
export async function initBrowser(): Promise<BrowserContext> {
  if (_context) return _context;

  console.log('🌐 [Session] Iniciando browser...');

  const browser = await chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
  });

  // Resolve as opções do context: adiciona storageState se o arquivo existir
  const ctxOptions: Record<string, any> = { ...CONTEXT_OPTIONS };

  if (hasSessionFile()) {
    console.log(`🔑 [Session] Carregando sessão de: ${SESSION_FILE}`);
    ctxOptions.storageState = SESSION_FILE;
  } else {
    console.warn(
      '⚠️ [Session] Arquivo de sessão não encontrado. ' +
        'O scraper vai rodar sem autenticação e pode cair na login wall.\n' +
        `   Execute localmente: npx tsx scripts/bootstrap-session.ts\n` +
        `   Depois copie o arquivo para: ${SESSION_FILE}`,
    );
  }

  const ctx = await browser.newContext(ctxOptions);

  // Injeta script anti-detecção em todas as páginas abertas neste context
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
  });

  // Salva automaticamente a sessão a cada SAVE_INTERVAL_MS
  setInterval(() => {
    saveSession(ctx).catch(() => {});
  }, SAVE_INTERVAL_MS);

  _browser = browser;
  _context = ctx;

  _browser.on('disconnected', () => {
    console.warn('⚠️ [Session] Browser desconectado.');
    _browser = null;
    _context = null;
    _sessionWarmed = false;
  });

  console.log('✅ [Session] Browser pronto.');
  return ctx;
}

/**
 * Encerra o browser de forma segura (graceful shutdown).
 */
export async function closeBrowser(): Promise<void> {
  const ctx = _context;
  const browser = _browser;
  _context = null;
  _browser = null;
  _sessionWarmed = false;

  if (ctx) await saveSession(ctx);
  if (browser) await browser.close().catch(() => {});
  console.log('🔒 [Session] Browser encerrado.');
}

// ── Session validation ────────────────────────────────────────────────────────

/**
 * Detecta se a página atual é a tela de login do Mercado Livre.
 */
export async function detectLoginWall(page: Page): Promise<boolean> {
  const url = page.url();

  if (
    url.includes('/lgz/') ||
    url.includes('/login') ||
    url.includes('/registration') ||
    url.includes('authentication')
  ) {
    return true;
  }

  try {
    return (await page.locator('text="Para continuar, acesse sua conta"').count()) > 0;
  } catch {
    return false;
  }
}

/**
 * Verifica se a sessão ainda está válida navegando para a homepage do ML
 * e procurando elementos de usuário autenticado.
 *
 * Retorna true = logado, false = sessão expirada/inválida.
 */
export async function isSessionValid(context: BrowserContext): Promise<boolean> {
  console.log('🔍 [Session] Verificando validade da sessão...');
  const page = await context.newPage();

  try {
    await page.goto('https://www.mercadolivre.com.br/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Detecta login wall
    if (await detectLoginWall(page)) {
      console.warn('⚠️ [Session] Sessão inválida — tela de login detectada.');
      _sessionInvalid = true;
      return false;
    }

    // Procura por elementos que só aparecem para usuários logados
    const loggedInIndicators = [
      '.nav-header-user-info',
      '[data-testid="action-bar-user"]',
      'a[href*="/perfil"]',
      'text="Olá"',
    ];

    for (const selector of loggedInIndicators) {
      if ((await page.locator(selector).count()) > 0) {
        console.log('✅ [Session] Sessão válida — usuário autenticado.');
        _sessionInvalid = false;
        return true;
      }
    }

    // Se não encontrou indicadores mas também não caiu na login wall,
    // assume como válida (pode ser que os seletores mudaram)
    console.log('✅ [Session] Sessão provavelmente válida (sem login wall).');
    _sessionInvalid = false;
    return true;
  } catch (e) {
    console.warn('⚠️ [Session] Erro ao verificar sessão:', e);
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Verifica se a sessão precisa ser renovada e sinaliza o admin.
 * NÃO tenta fazer login automático — apenas detecta e avisa.
 */
export async function refreshSessionIfNeeded(context: BrowserContext): Promise<void> {
  if (_sessionInvalid) {
    console.error(
      '❌ [Session] A sessão está inválida e precisa ser renovada manualmente.\n' +
        '   Execute localmente: npx tsx scripts/bootstrap-session.ts\n' +
        '   Depois copie o arquivo para o servidor e reinicie o scraper.',
    );
  }
}

// ── Warm session ──────────────────────────────────────────────────────────────

export function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((r) =>
    setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min),
  );
}

/**
 * Visita a homepage do ML antes de scrapar um produto, simulando um usuário
 * real. Só executa se a sessão ainda não foi aquecida recentemente.
 */
export async function warmSession(context: BrowserContext): Promise<void> {
  const now = Date.now();
  if (_sessionWarmed && now - _lastWarmTime < WARM_INTERVAL_MS) {
    console.log('♻️ [Session] Sessão ainda quente, pulando warm-up.');
    return;
  }

  console.log('🔥 [Session] Aquecendo sessão...');
  const page = await context.newPage();

  try {
    await page
      .goto('https://www.mercadolivre.com.br/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      .catch((e) => console.warn('[Session] Warm goto warning:', e.message));

    // Detecta login wall durante o warm-up (sinal de sessão expirada)
    if (await detectLoginWall(page)) {
      console.error('❌ [Session] Login wall detectado durante warm-up. Sessão expirada.');
      _sessionInvalid = true;
      await takeScreenshot(page, 'warm-login-wall');
      return;
    }

    // Descarta banner de cookies
    await page.locator('text=Aceitar cookies').click({ timeout: 2000 }).catch(() => {});

    // Simula comportamento humano
    await randomDelay(2000, 4000);
    await page.mouse.move(
      Math.floor(Math.random() * 800) + 100,
      Math.floor(Math.random() * 400) + 100,
    );
    await randomDelay(500, 1500);
    await page.evaluate(() =>
      window.scrollBy(0, Math.floor(Math.random() * 300) + 100),
    );
    await randomDelay(800, 2000);

    _sessionWarmed = true;
    _lastWarmTime = Date.now();
    _sessionInvalid = false;
    console.log('✅ [Session] Sessão aquecida.');

    // Persiste qualquer renovação de cookie que ocorreu
    await saveSession(context);
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

export async function takeScreenshot(page: Page, prefix: string): Promise<void> {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(SCREENSHOT_DIR, `${prefix}-${ts}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 [Session] Screenshot: ${file}`);
  } catch (e) {
    console.warn('⚠️ [Session] Falha no screenshot:', e);
  }
}

// ── Status ────────────────────────────────────────────────────────────────────

export interface SessionStatus {
  browserRunning: boolean;
  sessionWarmed: boolean;
  sessionInvalid: boolean;
  lastWarmAt: string | null;
  sessionFile: {
    exists: boolean;
    cookieCount: number;
    modifiedAt: string | null;
  };
}

export function getSessionStatus(): SessionStatus {
  const info = loadSessionInfo();
  return {
    browserRunning: _context !== null,
    sessionWarmed: _sessionWarmed,
    sessionInvalid: _sessionInvalid,
    lastWarmAt: _lastWarmTime > 0 ? new Date(_lastWarmTime).toISOString() : null,
    sessionFile: {
      exists: hasSessionFile(),
      cookieCount: info.cookieCount,
      modifiedAt: info.modifiedAt,
    },
  };
}
