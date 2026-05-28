const FILLER_PHRASES = [
  'donne moi',
  'donnez moi',
  'je cherche',
  'je veux',
  'je voudrais',
  'trouve moi',
  'trouvez moi',
  'cherche',
  'recherche',
  'montrez moi',
  'montre moi',
  'envoie moi',
  'pouvez vous',
  'est ce que vous avez',
  'avez vous',
  'où est',
  'ou est',
  'besoin de',
  'besoin du',
  'besoin d',
  'fichier',
  'document',
  'le fichier',
  'le document',
  'ce fichier',
  'pouvez-vous',
  's il vous plait',
  'svp',
  'stp',
  'merci',
] as const;

const EXPANSIONS: Record<string, string> = {
  rh: 'RH ressources humaines',
  po: 'PO purchase order bon commande',
  pca: 'PCA contrat',
  cv: 'CV curriculum vitae',
  cdc: 'cahier des charges',
  cr: 'compte rendu',
  of: 'offre',
};

export interface NormalizedQuery {
  rawMessage: string;
  searchQuery: string;
  isGreeting: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFillers(text: string): string {
  let out = text;
  for (const filler of FILLER_PHRASES) {
    out = out.replace(new RegExp(`\\b${filler}\\b`, 'g'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

function expandTokens(text: string): string {
  const tokens = text.split(' ').filter((t) => t.length > 0);
  const expanded = tokens.map((t) => EXPANSIONS[t] ?? t);
  return [...new Set(expanded.join(' ').split(' ').filter(Boolean))].join(' ');
}

function detectGreeting(rawMessage: string): boolean {
  const normalized = normalizeText(rawMessage);
  return /^(salut|bonjour|bonsoir|hello|hi|coucou|yo)\b/.test(normalized);
}

export function normalizeQuery(rawMessage: string): NormalizedQuery {
  const cleaned = rawMessage.trim();
  const normalized = normalizeText(cleaned);
  const withoutFillers = stripFillers(normalized);
  const expanded = expandTokens(withoutFillers);
  return {
    rawMessage: cleaned,
    searchQuery: expanded || normalized || cleaned,
    isGreeting: detectGreeting(cleaned),
  };
}

