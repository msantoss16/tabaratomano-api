import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

export interface ScrapedProduct {
  marketplace: string;
  title: string;
  price_cents: number;
  currency: string;
  rating?: number | undefined;
  review_count?: number | undefined;
  seller_name?: string | undefined;
  category?: string | undefined;
  images: string[];
  url_affiliate: string;
  url_canonical?: string | undefined;
}

export async function scrapeMercadoLivre(url: string): Promise<ScrapedProduct> {
  console.log('➜ Abrindo o navegador virtual...');
  const browser = await chromium.launch({ headless: false }); // headless: false abre a janela para você ver!
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log(`➜ Navegando para a página do produto: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('➜ Página carregada! Extraindo informações...');

    // Try to click any generic accept cookies button to avoid overlays
    await page.locator('text=Aceitar cookies').click({ timeout: 2000 }).catch(() => {});
    await page.locator('text=Entendi').click({ timeout: 2000 }).catch(() => {});

    const title = await page.locator('h1.ui-pdp-title').first().textContent().catch(() => '');
    
    const priceFractionStr = await page.locator('.ui-pdp-price__second-line .andes-money-amount__fraction').first().textContent().catch(() => null);
    const priceCentsStr = await page.locator('.ui-pdp-price__second-line .andes-money-amount__cents').first().textContent().catch(() => '00');
    
    let price_cents = 0;
    if (priceFractionStr) {
      const whole = parseInt(priceFractionStr.replace(/\D/g, ''), 10);
      const cents = parseInt(priceCentsStr ? priceCentsStr.replace(/\D/g, '') : '0', 10);
      price_cents = (whole * 100) + cents;
    }

    const images: string[] = [];
    const imageElements = await page.locator('.ui-pdp-gallery img').all();
    for (const img of imageElements) {
      const src = await img.getAttribute('src');
      const dataZoom = await img.getAttribute('data-zoom');
      const imageUrl = dataZoom || src;
      if (imageUrl && imageUrl.startsWith('http') && !images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    }

    const ratingStr = await page.locator('.ui-pdp-reviews__rating, .ui-review-capability__rating__average').first().textContent().catch(() => null);
    const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : undefined;

    const reviewCountStr = await page.locator('.ui-pdp-review__amount, .ui-review-capability__rating__label').first().textContent().catch(() => null);
    const review_count = reviewCountStr ? parseInt(reviewCountStr.replace(/\D/g, ''), 10) : undefined;

    const seller_name = await page.locator('.ui-seller-info__status-info h3, .ui-pdp-seller__link-trigger').first().textContent().catch(() => undefined);

    const url_canonical = await page.evaluate(() => {
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        return canonicalLink ? canonicalLink.getAttribute('href') : null;
    });

    return {
      marketplace: 'mercado_livre',
      title: title?.trim() || '',
      price_cents,
      currency: 'BRL',
      rating,
      review_count,
      seller_name: seller_name?.trim(),
      images: images.slice(0, 5), // Limiting to top 5 images
      url_affiliate: url,
      url_canonical: url_canonical || undefined,
    };
  } finally {
    await browser.close();
  }
}
