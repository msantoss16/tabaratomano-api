import { scrapeMercadoLivre } from './mercadolivre';

async function main() {
    console.log('--- Iniciando Teste de Scraping (Mercado Livre) ---');
    // Using a generic product URL for testing
    const testUrl = 'https://www.mercadolivre.com.br/creatina-monohidratada-500g-soldiers-nutrition-100-pura-importada-alta-performance-musculo-treino/p/MLB18725308?pdp_filters=item_id%3AMLB2794699684&matt_event_ts=1774487272457&matt_d2id=4115ed2f-9f48-4e23-abd5-394a874ff896&matt_tracing_id=35e25872-3fc0-49fa-b84e-5e90a6a00bcb#reco_backend=item_decorator&wid=MLB2794699684&reco_client=home_affiliate-profile&reco_item_pos=0&source=affiliate-profile&reco_backend_type=function&reco_id=3ba11b63-2127-4383-a37a-1821fddca354&tracking_id=626d8091-b846-401d-a491-40dc7371d4f7&sid=recos&c_id=/home/card-featured/element&c_uid=d23fb139-5c0e-408a-87e8-9eb5fbf4ab2b';
    
    console.log(`Minerando URL: ${testUrl}`);
    const result = await scrapeMercadoLivre(testUrl);
    
    console.dir(result, { depth: null, colors: true });
}

main().catch(console.error);
