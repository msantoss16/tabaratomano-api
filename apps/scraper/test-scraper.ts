import { scrapeUrl } from "./src/index.js";

async function test() {
  try {
    console.log("Iniciando o teste de scraping...");
    const baseInput = "meli.la/17onQuE";
    // Fix missing http in the logic just like the controller does
    const url = baseInput.startsWith('http') ? baseInput : `https://${baseInput}`;
    
    console.log(`URL a ser testada: ${url}`);
    const data = await scrapeUrl(url);
    console.log("Resultado:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Erro fatal:", error);
  }
}

test();
