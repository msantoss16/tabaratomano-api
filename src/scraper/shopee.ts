import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import type { ScrapedProduct } from './mercadolivre';

chromium.use(stealth());

export async function scrapeShopee(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Shopee sometimes requires you to wait for a specific element
    await page.waitForTimeout(5000); // Wait a bit for JS to render

    const title = await page.locator('.M_WvC_, [data-sqe="name"], h1').first().textContent().catch(() => '');
    
    const priceStr = await page.locator('.W1ZpBv, .pqTWkA').first().textContent().catch(() => null);
    let price_cents = 0;
    if (priceStr) {
      // Shopee price looks like "R$ 15,90" or "R$15,90"
      const cleaned = priceStr.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      price_cents = Math.round(parseFloat(cleaned) * 100);
    }

    // Images
    const images: string[] = [];
    const imageElements = await page.locator('.customized-image-carousel img').all();
    for (const img of imageElements) {
        const src = await img.getAttribute('src');
        if (src && src.startsWith('http') && !images.includes(src)) {
            // High-res shopee images replacing '_tn'
            images.push(src.replace('_tn', ''));
        }
    }

    // Fallback image
    if (images.length === 0) {
        const fallbackImg = await page.locator('.N-yZc0 img').first().getAttribute('src').catch(() => null);
        if (fallbackImg) images.push(fallbackImg);
    }

    const ratingStr = await page.locator('.product-rating-overview__score').first().textContent().catch(() => null);
    const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : undefined;

    const reviewCountStr = await page.locator('.product-rating-overview__filters .product-rating-overview__filter--active').first().textContent().catch(() => null);
    const review_count = reviewCountStr ? parseInt(reviewCountStr.replace(/\D/g, ''), 10) : undefined;

    const seller_name = await page.locator('.VlD_N_').first().textContent().catch(() => undefined);

    const url_canonical = await page.evaluate(() => {
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        return canonicalLink ? canonicalLink.getAttribute('href') : null;
    });

    return {
      marketplace: 'shopee',
      title: title?.trim() || '',
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
