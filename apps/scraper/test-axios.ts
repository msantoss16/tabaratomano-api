import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFetch() {
  const url = 'https://produto.mercadolivre.com.br/MLB-3559385559-smartphone-samsung-galaxy-a15-4g-128gb-4gb-ram-azul-escuro-_JM';
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const $ = cheerio.load(data);
    const title = $('h1.ui-pdp-title').text();
    console.log("Title found:", title);

    const priceFractionStr = $('.ui-pdp-price__second-line .andes-money-amount__fraction').first().text();
    const priceCentsStr = $('.ui-pdp-price__second-line .andes-money-amount__cents').first().text();
    console.log("Price:", priceFractionStr, "Cents:", priceCentsStr);

  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testFetch();
