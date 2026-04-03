import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import type { ScrapedProduct } from './mercadolivre.js';

chromium.use(stealth());

export async function scrapeMagalu(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Go to URL and wait until the dom is parsed (less strict than networkidle)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Handle generic cookie popups
    await page.locator('text=Entendi').click({ timeout: 2000 }).catch(() => {});
    await page.locator('text=Aceitar').click({ timeout: 2000 }).catch(() => {});

    // Try to get structured data if available
    const ldJsonStr = await page.locator('script[type="application/ld+json"]').first().textContent().catch(() => null);
    let structuredData: any = {};
    if (ldJsonStr) {
        try {
            structuredData = JSON.parse(ldJsonStr);
        } catch(e) {}
    }

    const title = await page.locator('h1[data-testid="heading-product-title"]').first().textContent().catch(() => '');
    
    // Price usually in [data-testid="price-value"]
    const priceStr = await page.locator('[data-testid="price-value"]').first().textContent().catch(() => null);
    let price_cents = 0;
    if (priceStr) {
      // Magalu price usually comes formatted like "R$ 1.999,00"
      const cleaned = priceStr.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      price_cents = Math.round(parseFloat(cleaned) * 100);
    }

    if (!price_cents && structuredData?.offers?.price) {
        price_cents = Math.round(parseFloat(structuredData.offers.price) * 100);
    }

    // Images
    const images: string[] = [];
    const imageElements = await page.locator('[data-testid="image-gallery"] img').all();
    for (const img of imageElements) {
        const src = await img.getAttribute('src');
        if (src && src.startsWith('http') && !images.includes(src)) {
            images.push(src);
        }
    }

    // Rating
    const ratingStr = await page.locator('[data-testid="review-summary-rating"]').first().textContent().catch(() => null);
    const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : undefined;

    // Review count
    const reviewCountStr = await page.locator('[data-testid="review-summary-total"]').first().textContent().catch(() => null);
    const review_count = reviewCountStr ? parseInt(reviewCountStr.replace(/\D/g, ''), 10) : undefined;

    // Seller (Vendido e entregue por ...)
    const seller_name = await page.locator('[data-testid="seller-info"] strong').first().textContent().catch(() => 'Magazine Luiza');

    const url_canonical = await page.evaluate(() => {
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        return canonicalLink ? canonicalLink.getAttribute('href') : null;
    });

    return {
      marketplace: 'magalu',
      title: title?.trim() || structuredData?.name || '',
      price_cents,
      currency: 'BRL',
      rating,
      review_count,
      seller_name: seller_name?.trim(),
      images: images.slice(0, 5),
      url_affiliate: url,
      url_canonical: url_canonical || undefined,
    };
  } finally {
    await browser.close();
  }
}
