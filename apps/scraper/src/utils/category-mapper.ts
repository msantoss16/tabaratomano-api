import * as fs from 'fs';
import * as path from 'path';

// Define the root categories we want to map to
export const SITE_CATEGORIES = {
  eletronicos: { label: 'Eletrônicos', icon: 'Smartphone' },
  casa: { label: 'Casa', icon: 'Home' },
  fitness: { label: 'Fitness', icon: 'Dumbbell' },
  moda: { label: 'Moda', icon: 'Shirt' },
  games: { label: 'Games', icon: 'Gamepad2' },
  beleza: { label: 'Beleza', icon: 'Sparkles' },
  infantil: { label: 'Infantil', icon: 'Baby' },
  esportes: { label: 'Esportes', icon: 'Trophy' },
  livros: { label: 'Livros', icon: 'BookOpen' },
  automotivo: { label: 'Automotivo', icon: 'Car' },
  pet: { label: 'Pet', icon: 'PawPrint' },
  mercado: { label: 'Mercado', icon: 'ShoppingCart' },
};

// Mapping from Mercado Livre ROOT category IDs to site category slugs
const ML_ROOT_MAPPING: Record<string, keyof typeof SITE_CATEGORIES> = {
  MLB1000: 'eletronicos', // Eletrônicos, Áudio e Vídeo
  MLB1553: 'eletronicos', // Informática
  MLB1051: 'eletronicos', // Celulares e Telefones
  MLB1039: 'eletronicos', // Câmeras e Acessórios
  MLB1144: 'games',        // Games
  MLB1430: 'moda',         // Calçados, Roupas e Bolsas
  MLB3937: 'moda',         // Joias e Relógios
  MLB1276: 'esportes',     // Esportes e Fitness
  MLB1574: 'casa',         // Casa, Móveis e Decoração
  MLB5726: 'casa',         // Eletrodomésticos
  MLB1500: 'casa',         // Construção
  MLB263532: 'casa',       // Ferramentas
  MLB1246: 'beleza',       // Beleza e Cuidado Pessoal
  MLB264586: 'beleza',     // Saúde
  MLB1384: 'infantil',     // Bebês
  MLB1132: 'infantil',     // Brinquedos e Hobbies
  MLB1071: 'pet',          // Pet Shop
  MLB1403: 'mercado',      // Alimentos e Bebidas
  MLB1196: 'livros',       // Livros, Revistas e Comics
  MLB5672: 'automotivo',   // Acessórios para Veículos
  MLB1743: 'automotivo',   // Carros, Motos e Outros
};

interface MLCategory {
  id: string;
  name: string;
  children_categories: { id: string; name: string }[];
}

let childToParent: Record<string, string> | null = null;

function loadCategoryMap() {
  if (childToParent) return;

  try {
    const jsonPath = path.resolve(process.cwd(), '../../public/mlb-root-categories.json');
    if (!fs.existsSync(jsonPath)) {
      console.warn(`[CategoryMapper] JSON not found at ${jsonPath}`);
      childToParent = {};
      return;
    }

    const data: Record<string, MLCategory> = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    childToParent = {};

    for (const id in data) {
      const cat = data[id];
      if (cat && cat.children_categories) {
        for (const child of cat.children_categories) {
          childToParent[child.id] = id;
        }
      }
    }
    console.log(`[CategoryMapper] Loaded ${Object.keys(childToParent).length} parent relationships.`);
  } catch (err) {
    console.error('[CategoryMapper] Error loading categories:', err);
    childToParent = {};
  }
}

/**
 * Finds the root category for a given MLB category ID and maps it to a site category.
 */
export function mapMLCategoryToSite(categoryId: string | undefined): { label: string; value: string } | null {
  if (!categoryId) return null;
  
  loadCategoryMap();
  if (!childToParent) return null;

  let currentId = categoryId;
  let visited = new Set<string>();

  // Traverse up to find a root category that we have a mapping for
  while (currentId && !visited.has(currentId)) {
    if (currentId in ML_ROOT_MAPPING) {
      const slug = ML_ROOT_MAPPING[currentId];
      if (slug) {
        return {
          label: SITE_CATEGORIES[slug].label,
          value: slug,
        };
      }
    }
    visited.add(currentId);
    currentId = childToParent[currentId] || '';
  }

  return null;
}

/**
 * Fallback mapping based on name (if ID is not available)
 */
export function mapNameByKeywords(name: string | undefined): { label: string; value: string } | null {
  if (!name) return null;
  const n = name.toLowerCase();

  if (n.includes('celular') || n.includes('iphone') || n.includes('eletronico') || n.includes('informatica')) return { label: 'Eletrônicos', value: 'eletronicos' };
  if (n.includes('casa') || n.includes('cozinha') || n.includes('decor')) return { label: 'Casa', value: 'casa' };
  if (n.includes('esporte') || n.includes('tenis') || n.includes('suplemento')) return { label: 'Esportes', value: 'esportes' };
  if (n.includes('game') || n.includes('jogos') || n.includes('playstation')) return { label: 'Games', value: 'games' };
  if (n.includes('moda') || n.includes('roupa') || n.includes('calcado')) return { label: 'Moda', value: 'moda' };
  if (n.includes('beleza') || n.includes('maquiagem') || n.includes('perfume')) return { label: 'Beleza', value: 'beleza' };
  if (n.includes('bebe') || n.includes('brinquedo') || n.includes('infantil')) return { label: 'Infantil', value: 'infantil' };
  if (n.includes('carro') || n.includes('moto') || n.includes('automotivo')) return { label: 'Automotivo', value: 'automotivo' };
  if (n.includes('pet') || n.includes('cachorro') || n.includes('gato')) return { label: 'Pet', value: 'pet' };
  if (n.includes('mercado') || n.includes('alimento') || n.includes('bebida')) return { label: 'Mercado', value: 'mercado' };
  if (n.includes('livro')) return { label: 'Livros', value: 'livros' };

  return null;
}
