import * as path from 'path';
import * as fs from 'fs';
import {
  initBrowser,
  warmSession,
  detectLoginWall,
  takeScreenshot,
  randomDelay,
  SCREENSHOT_DIR,
} from './session.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapedProduct {
  marketplace: string;
  title: string;
  price_cents: number;
  currency: string;
  rating?: number;
  review_count?: number;
  seller_name?: string;
  category?: string;
  images: string[];
  url_affiliate: string;
  url_canonical?: string;
}

// ── Main scrape entry point ───────────────────────────────────────────────────

/**
 * Scrapes a Mercado Livre product page (or affiliate link).
 *
 * Uses the shared persistent BrowserContext from session.ts, so cookies and
 * session identity are preserved between calls — no cold browser launches.
 */
export async function scrapeMercadoLivre(url: string): Promise<ScrapedProduct> {
  // 1. Get (or create) the shared persistent browser context
  const context = await initBrowser();

  // 2. Warm the session (visits ML homepage to set cookies/referer).
  //    warmSession() is smart: it's a no-op if the session is already warm.
  await warmSession(context);

  // 3. Open a new page for this scraping request.
  //    We only close the *page*, never the context, to preserve the session.
  const page = await context.newPage();

  try {
    console.log(`➜ [ML] Navegando para: ${url}`);
    await page
      .goto(url, { waitUntil: 'load', timeout: 60000 })
      .catch((e) => console.log('[ML] Goto warning:', e.message));

    console.log('➜ [ML] Aguardando seletores iniciais...');

    // Wait for any of: product title, affiliate button, or login wall
    await page
      .waitForSelector(
        [
          '.ui-pdp-title',
          'a:has-text("Ir para produto")',
          'button:has-text("Ir para produto")',
          'text="Para continuar, acesse sua conta"',
          'text="Sou novo"',
        ].join(', '),
        { timeout: 30000 },
      )
      .catch(() => {});

    // ── Affiliate showcase page handling ──────────────────────────────────────
    const goToProductBtn = await page.$(
      'a:has-text("Ir para produto"), button:has-text("Ir para produto")',
    );
    if (goToProductBtn) {
      console.log('➜ [ML] Página de vitrine de afiliado detectada.');

      // Prefer href navigation over click — less likely to trigger bot detection
      const href = await page.evaluate((el) => el.getAttribute('href'), goToProductBtn);
      if (href) {
        console.log(`➜ [ML] Redirecionando via href: ${href}`);
        await page
          .goto(href, { waitUntil: 'load', timeout: 60000 })
          .catch((e) => console.log('[ML] Goto warning:', e.message));
      } else {
        await randomDelay(500, 1200);
        await goToProductBtn.click();
      }

      // Wait for result after redirect
      await page
        .waitForSelector(
          '.ui-pdp-title, text="Para continuar, acesse sua conta", text="Sou novo"',
          { timeout: 30000 },
        )
        .catch(() => {});
    }

    // ── Login wall check & recovery ───────────────────────────────────────────
    if (await detectLoginWall(page)) {
      // Take a screenshot so we can see the login wall
      await takeScreenshot(page, 'login-wall-mercadolivre');

      throw new Error(
        '[ML] Sessão bloqueada pela tela de login do Mercado Livre. ' +
        'A sessão autenticada expirou ou é inválida. Renove via Admin ou bootstrap-session.ts.',
      );
    }

    // ── Cookie banner dismissal ───────────────────────────────────────────────
    await page.locator('text=Aceitar cookies').click({ timeout: 2000 }).catch(() => {});
    await page.locator('text=Entendi').click({ timeout: 2000 }).catch(() => {});

    // ── Diagnostic screenshot of the final loaded page ────────────────────────
    await takeScreenshot(page, 'page-mercadolivre');
    console.log(`➜ [ML] URL final: ${page.url()}`);

    // ── Data extraction ───────────────────────────────────────────────────────
    const product = await extractProductData(page, url);

    // ── Validate result ───────────────────────────────────────────────────────
    if (!product.title) {
      await takeScreenshot(page, 'empty-result-mercadolivre');
      throw new Error(
        `[ML] Título não encontrado após scraping. URL final: ${page.url()}`,
      );
    }

    console.log(`✅ [ML] Produto extraído: "${product.title}" — R$${(product.price_cents / 100).toFixed(2)}`);
    return product;

  } catch (error) {
    console.error('[ML] Erro durante scraping:', error);
    // Last-resort error screenshot
    await takeScreenshot(page, 'error-mercadolivre');
    throw error;
  } finally {
    // Close the PAGE only — the context (and its session) stays alive
    await page.close().catch(() => {});
  }
}

// ── Data extraction ───────────────────────────────────────────────────────────

/**
 * Extracts all product data from an already-loaded Mercado Livre product page.
 * Kept as a separate function for testability and clarity.
 */
async function extractProductData(
  page: import('playwright').Page,
  affiliateUrl: string,
): Promise<ScrapedProduct> {
  const title = await page
    .locator('.ui-pdp-title')
    .first()
    .textContent()
    .catch(() => '');

  // Price: integer part + cents part
  const priceFractionStr = await page
    .locator('.ui-pdp-price__second-line .andes-money-amount__fraction')
    .first()
    .textContent()
    .catch(() => null);
  const priceCentsStr = await page
    .locator('.ui-pdp-price__second-line .andes-money-amount__cents')
    .first()
    .textContent()
    .catch(() => '00');

  let price_cents = 0;
  if (priceFractionStr) {
    const whole = parseInt(priceFractionStr.replace(/\D/g, ''), 10);
    const cents = parseInt(
      priceCentsStr ? priceCentsStr.replace(/\D/g, '') : '0',
      10,
    );
    price_cents = whole * 100 + cents;
  }

  // Images: og:image first, then gallery
  const images = await page.evaluate(() => {
    const urls: string[] = [];
    const ogImage = document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content');
    if (ogImage && ogImage.startsWith('http')) urls.push(ogImage);

    document.querySelectorAll('.ui-pdp-gallery img').forEach((img) => {
      const src = img.getAttribute('src');
      const dataZoom = img.getAttribute('data-zoom');
      const imageUrl = dataZoom || src;
      if (
        imageUrl &&
        imageUrl.startsWith('http') &&
        !imageUrl.includes('.svg') &&
        !urls.includes(imageUrl)
      ) {
        urls.push(imageUrl);
      }
    });
    return urls;
  });

  // Rating
  const ratingStr = await page
    .locator('.ui-pdp-reviews__rating, .ui-review-capability__rating__average')
    .first()
    .textContent()
    .catch(() => null);
  const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : undefined;

  // Review count
  const reviewCountStr = await page
    .locator('.ui-pdp-review__amount, .ui-review-capability__rating__label')
    .first()
    .textContent()
    .catch(() => null);
  const review_count = reviewCountStr
    ? parseInt(reviewCountStr.replace(/\D/g, ''), 10)
    : undefined;

  // Seller
  const seller_name = await page
    .locator('.ui-seller-info__status-info h3, .ui-pdp-seller__link-trigger')
    .first()
    .textContent()
    .catch(() => undefined);

  // Category from breadcrumbs
  const category = await page.evaluate(() => {
    const breadcrumbs = document.querySelectorAll('.andes-breadcrumb__item');
    if (breadcrumbs.length > 2) return breadcrumbs[1]?.textContent?.trim();
    return breadcrumbs[0]?.textContent?.trim();
  }).catch(() => undefined);

  // Canonical URL
  const url_canonical = await page
    .evaluate(() => {
      const link = document.querySelector('link[rel="canonical"]');
      return link ? link.getAttribute('href') : null;
    })
    .catch(() => null);

  return {
    marketplace: 'mercado_livre',
    title: title?.trim() || '',
    price_cents,
    currency: 'BRL',
    rating,
    review_count,
    seller_name: seller_name?.trim(),
    category,
    images: images.slice(0, 5),
    url_affiliate: affiliateUrl,
    url_canonical: url_canonical || undefined,
  };
}
