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
  // English fillers
  'can you find',
  'can you show',
  'can you give',
  'please find',
  'please show',
  'i need',
  'i want',
  'i am looking for',
  'looking for',
  'do you have',
  'where is',
  'where can i find',
  'show me',
  'give me',
  'find me',
  'send me',
] as const;

const EXPANSIONS: Record<string, string> = {
  rh: 'RH ressources humaines',
  po: 'PO purchase order bon commande',
  pca: 'PCA contrat',
  cv: 'CV curriculum vitae',
  cdc: 'cahier des charges',
  cr: 'compte rendu',
  of: 'offre',
  hr: 'HR human resources',
  inv: 'invoice facture',
  doc: 'document',
  ref: 'reference',
};

// Greeting words in both languages including slang/SMS variants
const GREETING_WORDS = [
  'salut', 'bonjour', 'bonsoir', 'coucou', 'bjr', 'bj', 'bsr', 'slm', 'salam', 'saha', 'wesh', 'cc',
  'hello', 'hi', 'hey', 'yo', 'howdy', 'sup', 'good morning', 'good evening', 'good night', 'good afternoon',
  'bonne journee', 'bonne soiree', 'bonne nuit', 'bonne matinee',
];

// French and English indicator patterns for language detection
const FR_PATTERN = /\b(bonjour|salut|merci|oui|non|le|la|les|un|une|des|est|je|tu|nous|vous|que|qui|quoi|comment|pourquoi|ou|quand|cherche|besoin|document|fichier|avec|pour|dans|sur|son|sa|ses|mon|ma|mes|ton|ta|tes|leur|ce|cet|cette|ces|quel|quelle|trouver|voir|donner)\b/i;
const EN_PATTERN = /\b(hello|hi|hey|the|and|you|me|my|what|how|why|where|please|thank|can|could|find|file|search|need|want|get|show|give|have|is|are|was|were|will|would|should|invoice|report|contract|order)\b/i;

export type Language = 'fr' | 'en' | 'mixed';

export interface NormalizedQuery {
  rawMessage: string;
  searchQuery: string;
  isGreeting: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

/** Detects if a message is a pure greeting with no meaningful search intent */
function detectGreeting(rawMessage: string): boolean {
  const normalized = normalizeText(rawMessage);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;
  return GREETING_WORDS.some(
    (g) =>
      normalized === g ||
      normalized.startsWith(g + ' ') ||
      normalized.startsWith(g + ',') ||
      normalized.startsWith(g + '!')
  );
}

/** Detects the primary language of a message */
export function detectLanguage(text: string): Language {
  const hasFr = FR_PATTERN.test(text);
  const hasEn = EN_PATTERN.test(text);
  if (hasFr && hasEn) return 'mixed';
  if (hasEn && !hasFr) return 'en';
  return 'fr';
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
