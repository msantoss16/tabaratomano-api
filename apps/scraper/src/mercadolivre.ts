import { chromium } from 'playwright-extra';
// @ts-ignore
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log(`➜ Navegando para a página do produto: ${url}`);
    
    // Instead of waitUntil: domcontentloaded which breaks on affiliate redirects,
    // we just navigate and explicitly wait for the product container/title to appear.
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => console.log('Goto warning:', e.message));

    console.log('➜ Aguardando redirecionamentos e carregamento da página final...');
    
    // Wait for the title element which confirms we are on the Mercado Livre product page
    // OR wait for the affiliate showcase "Ir para produto" button OR login wall
    await page.waitForSelector('.ui-pdp-title, a:has-text("Ir para produto"), button:has-text("Ir para produto"), text="Para continuar, acesse sua conta", text="Sou novo"', { timeout: 30000 }).catch(() => {});

    const goToProductBtn = await page.$('a:has-text("Ir para produto"), button:has-text("Ir para produto")');
    if (goToProductBtn) {
      console.log('➜ Página de vitrine de afiliado detectada.');
      const href = await page.evaluate((el) => el.getAttribute('href'), goToProductBtn);
      
      if (href) {
        console.log(`➜ Redirecionando para: ${href}`);
        await page.goto(href, { waitUntil: 'load', timeout: 60000 }).catch(e => console.log('Goto warning:', e.message));
      } else {
        console.log('➜ Clicando em "Ir para produto"...');
        await goToProductBtn.click();
      }
      
      await page.waitForSelector('.ui-pdp-title, text="Para continuar, acesse sua conta", text="Sou novo"', { timeout: 30000 }).catch(() => {});
    }

    // Check for login wall
    let currentUrl = page.url();
    const loginWall = await page.$('text="Para continuar, acesse sua conta", text="Sou novo", text="Já tenho conta"');
    if (loginWall || currentUrl.includes('login') || currentUrl.includes('registration')) {
        console.log('➜ Tela de login detectada. Tentando extrair a URL de destino...');
        let goUrl: string | null = null;
        try {
            const urlObj = new URL(currentUrl);
            goUrl = urlObj.searchParams.get('go') || urlObj.searchParams.get('return_url');
            if (goUrl) {
                goUrl = decodeURIComponent(goUrl);
            }
        } catch (e) {}

        if (goUrl) {
            console.log(`➜ Redirecionando direto para o produto: ${goUrl}`);
            await page.goto(goUrl, { waitUntil: 'load', timeout: 60000 });
            await page.waitForSelector('.ui-pdp-title', { timeout: 30000 });
        } else {
            console.log('➜ Não foi possível extrair a URL de destino da tela de login.');
        }
    }

    console.log('➜ Página carregada! Extraindo informações...');

    // Try to click any generic accept cookies button to avoid overlays
    await page.locator('text=Aceitar cookies').click({ timeout: 2000 }).catch(() => {});
    await page.locator('text=Entendi').click({ timeout: 2000 }).catch(() => {});

    const title = await page.locator('.ui-pdp-title').first().textContent().catch(() => '');
    
    const priceFractionStr = await page.locator('.ui-pdp-price__second-line .andes-money-amount__fraction').first().textContent().catch(() => null);
    const priceCentsStr = await page.locator('.ui-pdp-price__second-line .andes-money-amount__cents').first().textContent().catch(() => '00');
    
    let price_cents = 0;
    if (priceFractionStr) {
      const whole = parseInt(priceFractionStr.replace(/\D/g, ''), 10);
      const cents = parseInt(priceCentsStr ? priceCentsStr.replace(/\D/g, '') : '0', 10);
      price_cents = (whole * 100) + cents;
    }

    const images = await page.evaluate(() => {
      const urls: string[] = [];
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImage && ogImage.startsWith('http')) {
        urls.push(ogImage);
      }
      const imageElements = document.querySelectorAll('.ui-pdp-gallery img');
      imageElements.forEach((img) => {
        const src = img.getAttribute('src');
        const dataZoom = img.getAttribute('data-zoom');
        const imageUrl = dataZoom || src;
        if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('.svg') && !urls.includes(imageUrl)) {
          urls.push(imageUrl);
        }
      });
      return urls;
    });

    const ratingStr = await page.locator('.ui-pdp-reviews__rating, .ui-review-capability__rating__average').first().textContent().catch(() => null);
    const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : undefined;

    const reviewCountStr = await page.locator('.ui-pdp-review__amount, .ui-review-capability__rating__label').first().textContent().catch(() => null);
    const review_count = reviewCountStr ? parseInt(reviewCountStr.replace(/\D/g, ''), 10) : undefined;

    const seller_name = await page.locator('.ui-seller-info__status-info h3, .ui-pdp-seller__link-trigger').first().textContent().catch(() => undefined);

    const category = await page.evaluate(() => {
      const breadcrumbs = document.querySelectorAll('.andes-breadcrumb__item');
      if (breadcrumbs.length > 2) {
        // Usually the second or third item is a good category (e.g. Home > Electronics > SMARTPHONES)
        return breadcrumbs[1]?.textContent?.trim();
      }
      return breadcrumbs[0]?.textContent?.trim();
    }).catch(() => undefined);

    const url_canonical = await page.evaluate(() => {
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        return canonicalLink ? canonicalLink.getAttribute('href') : null;
    });

    const finalUrl = page.url();
    console.log(`➜ URL final da página: ${finalUrl}`);

    // Validate: if title is empty, the page didn't load correctly
    if (!title || title.trim() === '') {
      const pageHtml = await page.content().catch(() => '');
      console.error(`➜ Título não encontrado. URL final: ${finalUrl}`);
      console.error(`➜ Início do HTML: ${pageHtml.substring(0, 500)}`);
      const dir = path.resolve(process.cwd(), '../../scraper-errors');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await page.screenshot({ path: path.join(dir, `empty-result-${timestamp}.png`), fullPage: true }).catch(() => {});
      throw new Error(`Página do produto não carregou corretamente. URL final: ${finalUrl}`);
    }

    return {
      marketplace: 'mercado_livre',
      title: title?.trim() || '',
      price_cents,
      currency: 'BRL',
      rating,
      review_count,
      seller_name: seller_name?.trim(),
      category: category,
      images: images.slice(0, 5), // Limiting to top 5 images
      url_affiliate: url,
      url_canonical: url_canonical || undefined,
    };
  } catch (error) {
    console.error('Error during scraping, taking screenshot...', error);
    const dir = path.resolve(process.cwd(), '../../scraper-errors');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: path.join(dir, `error-mercadolivre-${timestamp}.png`), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}
