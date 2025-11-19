/**
 * Mapeamento de cores por fonte de anúncio
 */

export interface SourceColorConfig {
  bg: string;
  text: string;
  border: string;
}

const sourceColorMap: Record<string, SourceColorConfig> = {
  idealista: {
    bg: 'bg-[#FFD700]/20',
    text: 'text-[#FFD700]',
    border: 'border-[#FFD700]/30'
  },
  casasapo: {
    bg: 'bg-[#00A859]/20',
    text: 'text-[#00A859]',
    border: 'border-[#00A859]/30'
  },
  'casa sapo': {
    bg: 'bg-[#00A859]/20',
    text: 'text-[#00A859]',
    border: 'border-[#00A859]/30'
  },
  imovirtual: {
    bg: 'bg-[#FF6B35]/20',
    text: 'text-[#FF6B35]',
    border: 'border-[#FF6B35]/30'
  },
  olx: {
    bg: 'bg-[#002F34]/20',
    text: 'text-[#00A859]', // Verde OLX
    border: 'border-[#00A859]/30'
  },
  custojusto: {
    bg: 'bg-[#E63946]/20',
    text: 'text-[#E63946]',
    border: 'border-[#E63946]/30'
  },
  'custo justo': {
    bg: 'bg-[#E63946]/20',
    text: 'text-[#E63946]',
    border: 'border-[#E63946]/30'
  }
};

const defaultColors: SourceColorConfig = {
  bg: 'bg-gray-500/20',
  text: 'text-gray-400',
  border: 'border-gray-500/30'
};

/**
 * Obtém as cores para uma fonte de anúncio
 * @param siteName Nome do site (ex: "Idealista", "Casa Sapo")
 * @returns Configuração de cores para o site
 */
export function getSourceColors(siteName: string | null): SourceColorConfig {
  if (!siteName) return defaultColors;
  
  const normalizedName = siteName.toLowerCase().trim();
  return sourceColorMap[normalizedName] || defaultColors;
}

/**
 * Obtém o nome formatado da fonte
 * @param siteName Nome do site
 * @returns Nome formatado para exibição
 */
export function getFormattedSourceName(siteName: string | null): string {
  if (!siteName) return 'Outro';
  
  const nameMap: Record<string, string> = {
    'idealista': 'Idealista',
    'casasapo': 'Casa Sapo',
    'casa sapo': 'Casa Sapo',
    'imovirtual': 'Imovirtual',
    'olx': 'OLX',
    'custojusto': 'Custo Justo',
    'custo justo': 'Custo Justo'
  };
  
  const normalizedName = siteName.toLowerCase().trim();
  return nameMap[normalizedName] || siteName;
}
