import type { ScrapedProduct } from './mercadolivre';
import { scrapeMercadoLivre } from './mercadolivre';
import { scrapeMagalu } from './magalu';
import { scrapeShopee } from './shopee';

export async function scrapeUrl(url: string): Promise<ScrapedProduct> {
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('mercadolivre.com') || lowercaseUrl.includes('mercadolibre')) {
    console.log(`[Scraper] Identificado Mercado Livre: ${url}`);
    return scrapeMercadoLivre(url);
  } else if (lowercaseUrl.includes('magazineluiza.com') || lowercaseUrl.includes('magalu')) {
    console.log(`[Scraper] Identificado Magazine Luiza: ${url}`);
    return scrapeMagalu(url);
  } else if (lowercaseUrl.includes('shopee.com')) {
    console.log(`[Scraper] Identificada Shopee: ${url}`);
    return scrapeShopee(url);
  } else {
    throw new Error('Marketplace não suportado ou URL inválida.');
  }
}
