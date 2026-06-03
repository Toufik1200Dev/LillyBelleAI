import { resolveSharepointSearchQuery } from '../utils/sharepointQueryExtract';

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
  'numero de commande',
  'numero commande',
  'le numero',
  'cette opportunite',
  'cette opportunity',
  'de cette',
  'de ce',
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
  /** Primary query sent to search (best identifier or normalized text). */
  searchQuery: string;
  /** Ordered variants tried until hits are found. */
  searchQueries: string[];
  /** When message mentions opportunities, narrow SharePoint category. */
  preferOpportunitiesCategory: boolean;
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
/** Extract opportunity refs, PO codes, etc. from raw text before hyphen/accents are stripped. */
export function extractIdentifiers(rawMessage: string): string[] {
  const found = new Set<string>();
  const raw = rawMessage.trim();

  // Explicit separator variants: 2601-d7691 | 2601/d7691 | 2601_d7691 | 2601 - d7691
  for (const match of raw.matchAll(/\b(\d{4})\s*[-\/_]\s*([a-z0-9]{3,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  // n° / n° prefix with any or no separator: "n°2601-d7691", "n° 2601 d7691", "n° 2601-d7691"
  // Right part pattern [a-z]\d{2,} avoids matching common words (e.g. "document", "dossier")
  for (const match of raw.matchAll(/n[°º]\s*(\d{4})\s*[-\/_]?\s*([a-z]\d{2,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  // Pure-space separator when right part looks like a ref suffix: letter + 2+ digits (e.g. "d7691")
  // This won't match "2601 document" because "document" doesn't match [a-z]\d{2,}
  for (const match of raw.matchAll(/\b(\d{4})\s+([a-z]\d{2,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  const { resolved } = resolveSharepointSearchQuery(raw);
  if (resolved.length >= 4 && /\d/.test(resolved)) {
    found.add(resolved.replace(/\s+/g, ' ').trim());
  }

  return [...found];
}

export function buildSearchQueries(rawMessage: string): string[] {
  const identifiers = extractIdentifiers(rawMessage);
  const normalized = normalizeText(rawMessage);
  const withoutFillers = stripFillers(normalized);
  const expanded = expandTokens(withoutFillers);

  const candidates: string[] = [];

  for (const id of identifiers) {
    candidates.push(id);                         // canonical: "2601-d7691"
    if (id.includes('-')) {
      const [left, right] = id.split('-');
      candidates.push(`${left} ${right}`);       // space variant: "2601 d7691"
      candidates.push(`${left}/${right}`);       // slash variant: "2601/d7691"
      // Right part alone (e.g. "d7691") is specific enough to be useful.
      // Left part alone (e.g. "2601") is a 4-digit year-month prefix that matches hundreds of
      // unrelated accounting filenames — skip it to avoid noisy results.
      if (right && right.length >= 3) candidates.push(right);
      if (left && left.length >= 3 && !/^\d{4}$/.test(left)) candidates.push(left);
    }
  }

  if (expanded.length >= 3) candidates.push(expanded);
  if (withoutFillers.length >= 3 && withoutFillers !== expanded) candidates.push(withoutFillers);

  const deduped = [...new Set(candidates.map((c) => c.trim()).filter((c) => c.length >= 3))];
  return deduped.slice(0, 8);
}

export function detectLanguage(text: string): Language {
  const hasFr = FR_PATTERN.test(text);
  const hasEn = EN_PATTERN.test(text);
  if (hasFr && hasEn) return 'mixed';
  if (hasEn && !hasFr) return 'en';
  return 'fr';
}

export function normalizeQuery(rawMessage: string): NormalizedQuery {
  const cleaned = rawMessage.trim();
  const searchQueries = buildSearchQueries(cleaned);
  const preferOpportunitiesCategory = /\bopportunit/i.test(cleaned);
  return {
    rawMessage: cleaned,
    searchQuery: searchQueries[0] ?? cleaned,
    searchQueries: searchQueries.length > 0 ? searchQueries : [cleaned],
    preferOpportunitiesCategory,
    isGreeting: detectGreeting(cleaned),
  };
}
