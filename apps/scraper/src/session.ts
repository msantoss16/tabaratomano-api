import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import type { BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ── Stealth setup ─────────────────────────────────────────────────────────────
chromium.use(stealth());

// ── Paths ─────────────────────────────────────────────────────────────────────
// The ml-session directory is mounted as a Docker volume so it persists
// between container restarts. It stores the full Chromium user-data-dir
// (cookies, localStorage, IndexedDB, etc.) plus a fallback storageState.json.
export const SESSION_DIR = path.resolve(process.cwd(), '../../ml-session');
export const STORAGE_STATE_PATH = path.join(SESSION_DIR, 'storageState.json');
export const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../scraper-errors');

// ── Launch options ────────────────────────────────────────────────────────────
// Tuned to look like a real Brazilian Windows user, not a headless VPS bot.
const LAUNCH_OPTIONS = {
  headless: true,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  // Realistic viewport — avoids the "1280x720 headless bot" signature
  viewport: { width: 1366, height: 768 },
  // Realistic Chrome 124 user-agent for Windows
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  extraHTTPHeaders: {
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    // Key flag: disables the "navigator.webdriver" property
    '--disable-blink-features=AutomationControlled',
    '--lang=pt-BR',
    '--accept-lang=pt-BR',
    // Reduce GPU-related crashes on headless Linux
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--window-size=1366,768',
  ],
};

// ── Singleton context ─────────────────────────────────────────────────────────
// A single persistent context is reused across all scraping requests,
// preserving cookies and session identity between calls.
let _context: BrowserContext | null = null;
let _sessionWarmed = false;
let _lastWarmTime = 0;

// Re-warm the session every 30 minutes to keep it "alive"
const WARM_INTERVAL_MS = 30 * 60 * 1000;

// ── Browser init ──────────────────────────────────────────────────────────────

/**
 * Returns the shared BrowserContext, creating it if needed.
 * Uses `launchPersistentContext` so the entire browser profile
 * (cookies, localStorage, IndexedDB) is stored on disk and
 * survives container restarts via a Docker volume mount.
 */
export async function initBrowser(): Promise<BrowserContext> {
  if (_context) return _context;

  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  console.log('🌐 [Session] Iniciando browser com contexto persistente...');

  // launchPersistentContext = "Chrome com perfil salvo em disco"
  // Tudo que o navegador armazena (cookies, localStorage, cache) é
  // automaticamente persistido no SESSION_DIR entre execuções.
  const ctx = await (chromium as any).launchPersistentContext(
    SESSION_DIR,
    LAUNCH_OPTIONS,
  ) as BrowserContext;

  // Make the context a bit more stealthy at the JS level
  await ctx.addInitScript(() => {
    // Override the webdriver property
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Spoof plugins count (real browsers have plugins)
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    // Spoof languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
  });

  ctx.on('close', () => {
    console.log('⚠️ [Session] Contexto fechado inesperadamente.');
    _context = null;
    _sessionWarmed = false;
  });

  _context = ctx;
  console.log('✅ [Session] Browser iniciado.');
  return ctx;
}

/**
 * Safely close the browser (used on graceful shutdown).
 */
export async function closeBrowser(): Promise<void> {
  const ctx = _context;
  if (ctx) {
    _context = null;
    _sessionWarmed = false;
    await ctx.close().catch(() => {});
    console.log('🔒 [Session] Browser encerrado.');
  }
}

// ── Session persistence ───────────────────────────────────────────────────────

/**
 * Export the current browser cookies/storage to a JSON file.
 * Useful as a backup or to transfer a session to another machine.
 */
export async function saveSession(context: BrowserContext): Promise<void> {
  try {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log('💾 [Session] Sessão exportada para', STORAGE_STATE_PATH);
  } catch (e) {
    console.warn('⚠️ [Session] Não foi possível exportar a sessão:', e);
  }
}

export function hasStorageState(): boolean {
  return fs.existsSync(STORAGE_STATE_PATH);
}

// ── Login wall detection ──────────────────────────────────────────────────────

/**
 * Returns true if the current page is showing a Mercado Livre login wall.
 * Checks both URL patterns and DOM content.
 */
export async function detectLoginWall(page: Page): Promise<boolean> {
  const url = page.url();

  // URL-based check: ML login redirects contain these patterns
  if (
    url.includes('/login') ||
    url.includes('/registration') ||
    url.includes('mercadolivre.com.br/jms/') ||
    url.includes('authentication')
  ) {
    console.warn(`⚠️ [Session] Login wall detectado pela URL: ${url}`);
    return true;
  }

  // DOM-based check: look for the login page headline text
  try {
    const count = await page
      .locator('text="Para continuar, acesse sua conta"')
      .count();
    if (count > 0) {
      console.warn('⚠️ [Session] Login wall detectado pelo conteúdo da página.');
      return true;
    }
  } catch {
    // Ignore errors in the check itself
  }

  return false;
}

/**
 * Attempt to recover from a login wall by extracting the "go" redirect URL
 * and navigating directly to it, bypassing the login form.
 * Returns true if recovery succeeded.
 */
export async function handleLoginWall(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  console.log('🔄 [Session] Tentando recuperar da tela de login...');

  // Invalidate the warmed-session flag so warmSession() runs again next time
  _sessionWarmed = false;

  let targetUrl: string | null = null;
  try {
    const urlObj = new URL(currentUrl);
    const raw = urlObj.searchParams.get('go') || urlObj.searchParams.get('return_url');
    if (raw) targetUrl = decodeURIComponent(raw);
  } catch {
    // URL parsing failure — ignore
  }

  if (targetUrl) {
    console.log(`↩️ [Session] Redirecionando para URL de destino: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
    await page
      .waitForSelector('.ui-pdp-title', { timeout: 30000 })
      .catch(() => {});
    const stillOnLoginWall = await detectLoginWall(page);
    if (!stillOnLoginWall) {
      console.log('✅ [Session] Recuperação bem-sucedida.');
      return true;
    }
  }

  console.error(
    '❌ [Session] Não foi possível recuperar da tela de login. ' +
    'A sessão precisa ser renovada manualmente.',
  );
  return false;
}

// ── Warm session ──────────────────────────────────────────────────────────────

/**
 * Generates a random delay between min and max milliseconds.
 * Used to simulate human reading/thinking time.
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Visits the Mercado Livre homepage and simulates light human interaction
 * (mouse moves, scroll, small pause) to "warm" the session before scraping.
 *
 * Called automatically when the browser first starts or after a session
 * has been idle for more than WARM_INTERVAL_MS.
 */
export async function warmSession(context: BrowserContext): Promise<void> {
  const now = Date.now();
  const needsWarm = !_sessionWarmed || now - _lastWarmTime > WARM_INTERVAL_MS;

  if (!needsWarm) {
    console.log('♻️ [Session] Sessão ainda quente, pulando warm-up.');
    return;
  }

  console.log('🔥 [Session] Aquecendo sessão no Mercado Livre...');
  const page = await context.newPage();

  try {
    // Navigate to the homepage — this sets the right Referer/cookies
    // before we jump to a product page.
    await page
      .goto('https://www.mercadolivre.com.br/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      .catch((e) => console.warn('[Session] Warm goto warning:', e.message));

    // Dismiss cookie banner if present
    await page.locator('text=Aceitar cookies').click({ timeout: 2000 }).catch(() => {});

    // Simulate reading time
    await randomDelay(2000, 4000);

    // Simulate mouse movement across the page
    await page.mouse.move(
      Math.floor(Math.random() * 800) + 100,
      Math.floor(Math.random() * 400) + 100,
    );
    await randomDelay(500, 1200);

    // Scroll down a bit — real users don't stay at the top
    await page.evaluate(() =>
      window.scrollBy(0, Math.floor(Math.random() * 400) + 100),
    );
    await randomDelay(800, 2000);

    _sessionWarmed = true;
    _lastWarmTime = Date.now();
    console.log('✅ [Session] Sessão aquecida.');

    // Persist the cookies gathered during warm-up
    await saveSession(context);
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

/**
 * Saves a fullpage PNG screenshot to the scraper-errors directory.
 * Always resolves (never throws), so it's safe to call in catch/finally blocks.
 */
export async function takeScreenshot(page: Page, prefix: string): Promise<void> {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(SCREENSHOT_DIR, `${prefix}-${timestamp}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`📸 [Session] Screenshot salvo: ${filePath}`);
  } catch (e) {
    console.warn('⚠️ [Session] Falha ao salvar screenshot:', e);
  }
}
