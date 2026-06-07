import { resolveSharepointSearchQuery } from '../utils/sharepointQueryExtract';

// ---------------------------------------------------------------------------
// Filler phrases (FR + EN + SMS/slang)
// ---------------------------------------------------------------------------
const FILLER_PHRASES = [
  // French
  'donne moi', 'donnez moi', 'je cherche', 'je veux', 'je voudrais',
  'trouve moi', 'trouvez moi', 'cherche', 'recherche', 'montrez moi',
  'montre moi', 'envoie moi', 'pouvez vous', 'est ce que vous avez',
  'avez vous', 'où est', 'ou est', 'besoin de', 'besoin du', "besoin d",
  'fichier', 'document', 'le fichier', 'le document', 'ce fichier',
  'pouvez-vous', 's il vous plait', 'svp', 'stp', 'merci',
  'numero de commande', 'numero commande', 'le numero',
  'cette opportunite', 'cette opportunity', 'de cette', 'de ce',
  'auriez vous', 'pourriez vous', 'il me faut', 'il nous faut',
  'je recherche', 'nous cherchons', 'nous avons besoin',
  // English
  'can you find', 'can you show', 'can you give', 'please find',
  'please show', 'i need', 'i want', 'i am looking for', 'looking for',
  'do you have', 'where is', 'where can i find', 'show me', 'give me',
  'find me', 'send me', 'could you', 'would you', 'can you',
  'could you please', 'i would like', 'i would need',
] as const;

// ---------------------------------------------------------------------------
// Acronym / abbreviation expansions
// ---------------------------------------------------------------------------
const EXPANSIONS: Record<string, string> = {
  // French
  rh: 'RH ressources humaines',
  po: 'PO purchase order bon commande',
  pca: 'PCA contrat',
  cv: 'CV curriculum vitae',
  cdc: 'cahier des charges',
  cr: 'compte rendu',
  of: 'offre',
  pv: 'PV procès verbal',
  bc: 'BC bon de commande',
  bl: 'BL bon de livraison',
  dp: 'DP devis',
  da: 'DA demande achat',
  bdc: 'bon de commande',
  bpe: 'bon pour exécution',
  rib: 'RIB relevé identité bancaire',
  kbis: 'KBIS extrait registre commerce',
  dq: 'DQ devis quantitatif',
  dqe: 'DQE devis quantitatif estimatif',
  dcoe: 'DCOE décomposition coût élémentaire',
  cctp: 'CCTP cahier clauses techniques particulières',
  ccap: 'CCAP cahier clauses administratives particulières',
  dpgf: 'DPGF décomposition prix global forfaitaire',
  bpu: 'BPU bordereau prix unitaires',
  oe: 'offre entreprise',
  ts: 'TS technical specification',
  nda: 'NDA accord confidentialité',
  // English
  hr: 'HR human resources',
  inv: 'invoice facture',
  doc: 'document',
  ref: 'reference',
  req: 'request requisition',
  rfq: 'RFQ request for quotation',
  rfp: 'RFP request for proposal',
  sow: 'SOW statement of work',
  mou: 'MOU memorandum of understanding',
  kpi: 'KPI key performance indicator',
};

// ---------------------------------------------------------------------------
// Greeting detection
// ---------------------------------------------------------------------------
const GREETING_WORDS = [
  'salut', 'bonjour', 'bonsoir', 'coucou', 'bjr', 'bj', 'bsr',
  'slm', 'salam', 'saha', 'wesh', 'cc',
  'hello', 'hi', 'hey', 'yo', 'howdy', 'sup',
  'good morning', 'good evening', 'good night', 'good afternoon',
  'bonne journee', 'bonne soiree', 'bonne nuit', 'bonne matinee',
];

// ---------------------------------------------------------------------------
// Language detection patterns
// ---------------------------------------------------------------------------
const FR_PATTERN =
  /\b(bonjour|salut|merci|oui|non|le|la|les|un|une|des|est|je|tu|nous|vous|que|qui|quoi|comment|pourquoi|ou|quand|cherche|besoin|document|fichier|avec|pour|dans|sur|son|sa|ses|mon|ma|mes|ton|ta|tes|leur|ce|cet|cette|ces|quel|quelle|trouver|voir|donner)\b/i;
const EN_PATTERN =
  /\b(hello|hi|hey|the|and|you|me|my|what|how|why|where|please|thank|can|could|find|file|search|need|want|get|show|give|have|is|are|was|were|will|would|should|invoice|report|contract|order)\b/i;

// ---------------------------------------------------------------------------
// Library category signals
// ---------------------------------------------------------------------------

/** Keywords that indicate the Technique (operations) library */
const TECHNIQUE_PATTERN =
  /\b(techni(que)?|travaux|chantier|plan|schema|installation|maintenance|procedure|norme|spec(ification)?|étude|etude|calcul|génie|genie|infrastructure|équipement|equipement|materiel|matériel)\b/i;

/** Keywords that indicate the Vente France (sales) library */
const VENTE_PATTERN =
  /\b(vente|commercial|client|offre|opportunit|devis|proposition|contrat|commande|facture|prospect|deal|pipeline|revenue|ca|chiffre)\b/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Language = 'fr' | 'en' | 'mixed';

export interface NormalizedQuery {
  rawMessage: string;
  /** Primary query sent to search (best identifier or normalized text). */
  searchQuery: string;
  /** Ordered variants tried until hits are found. */
  searchQueries: string[];
  /** When message mentions opportunities, narrow SharePoint category. */
  preferOpportunitiesCategory: boolean;
  /** Signals the Technique library is the likely target. */
  preferTechniqueCategory: boolean;
  /** Signals the Vente France library is the likely target. */
  preferVenteCategory: boolean;
  /** Detected language of the original message. */
  language: Language;
  isGreeting: boolean;
  /** True when query was too short or empty after normalization — caller should ask for clarification. */
  isTooVague: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[_\-.]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFillers(text: string): string {
  let out = text;
  for (const filler of FILLER_PHRASES) {
    // escape special regex chars in filler just in case
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

function expandTokens(text: string): string {
  const tokens = text.split(' ').filter((t) => t.length > 0);
  const expanded = tokens.map((t) => EXPANSIONS[t] ?? t);
  return [...new Set(expanded.join(' ').split(' ').filter(Boolean))].join(' ');
}

/**
 * Rough French plural/suffix stemmer.
 * Strips common endings so "contrats" matches "contrat", "factures" matches "facture", etc.
 */
function stemFrench(text: string): string {
  return text
    .replace(/\b(\w{4,})aux\b/g, '$1al')        // locaux → local
    .replace(/\b(\w{4,})tions\b/g, '$1tion')    // validations → validation
    .replace(/\b(\w{4,})eurs\b/g, '$1eur')      // fournisseurs → fournisseur
    .replace(/\b(\w{4,})s\b/g, '$1');           // generic plural (contrats → contrat, factures → facture)
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

// ---------------------------------------------------------------------------
// Identifier extraction
// ---------------------------------------------------------------------------

/**
 * Extract structured references (opportunity refs, PO codes, etc.)
 * from raw text before hyphens/accents are stripped.
 */
export function extractIdentifiers(rawMessage: string): string[] {
  const found = new Set<string>();
  const raw = rawMessage.trim();

  // Explicit separator variants: 2601-d7691 | 2601/d7691 | 2601_d7691 | 2601 - d7691
  for (const match of raw.matchAll(/\b(\d{4})\s*[-\/_]\s*([a-z0-9]{3,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  // n° / nº prefix: "n°2601-d7691", "n° 2601 d7691"
  for (const match of raw.matchAll(/n[°º]\s*(\d{4})\s*[-\/_]?\s*([a-z]\d{2,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  // Pure-space separator when right part looks like ref suffix: letter + 2+ digits ("d7691")
  for (const match of raw.matchAll(/\b(\d{4})\s+([a-z]\d{2,})\b/gi)) {
    found.add(`${match[1]}-${match[2]}`.toLowerCase());
  }

  // Bare codes like "BC-2025-001", "INV2025042", "REF-0042", "PO-2024-099"
  // Match the full compound token so multi-segment codes are not truncated
  for (const match of raw.matchAll(/\b[A-Z]{2,5}(?:[-_]?\d+)+\b/g)) {
    found.add(match[0].toLowerCase().replace(/_/g, '-'));
  }

  const { resolved } = resolveSharepointSearchQuery(raw);
  if (resolved.length >= 4 && /\d/.test(resolved)) {
    found.add(resolved.replace(/\s+/g, ' ').trim());
  }

  return [...found];
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

export function buildSearchQueries(rawMessage: string): string[] {
  const identifiers = extractIdentifiers(rawMessage);
  const normalized = normalizeText(rawMessage);
  const withoutFillers = stripFillers(normalized);
  const expanded = expandTokens(withoutFillers);
  const stemmed = stemFrench(withoutFillers);

  const candidates: string[] = [];

  // 1. Structured identifiers first (most precise)
  for (const id of identifiers) {
    candidates.push(id);                              // "2601-d7691"
    if (id.includes('-')) {
      const [left, right] = id.split('-');
      candidates.push(`${left} ${right}`);            // "2601 d7691"
      candidates.push(`${left}/${right}`);            // "2601/d7691"
      if (right && right.length >= 3) candidates.push(right);
      if (left && left.length >= 3 && !/^\d{4}$/.test(left)) candidates.push(left);
    }
  }

  // 2. Expanded tokens (acronym-aware)
  if (expanded.length >= 3) candidates.push(expanded);

  // 3. Stripped fillers (plain)
  if (withoutFillers.length >= 3 && withoutFillers !== expanded) candidates.push(withoutFillers);

  // 4. Stemmed variant (handles plural forms)
  if (stemmed.length >= 3 && stemmed !== withoutFillers) candidates.push(stemmed);

  const deduped = [...new Set(candidates.map((c) => c.trim()).filter((c) => c.length >= 3))];
  return deduped.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function normalizeQuery(rawMessage: string): NormalizedQuery {
  const cleaned = rawMessage.trim();
  const searchQueries = buildSearchQueries(cleaned);
  const language = detectLanguage(cleaned);

  // Category signals
  const preferOpportunitiesCategory = /\bopportunit/i.test(cleaned);
  const preferTechniqueCategory = TECHNIQUE_PATTERN.test(cleaned);
  const preferVenteCategory = VENTE_PATTERN.test(cleaned);

  // Too vague: nothing meaningful survived normalization
  const isTooVague =
    searchQueries.length === 0 ||
    (searchQueries.length === 1 && searchQueries[0].length < 3);

  return {
    rawMessage: cleaned,
    searchQuery: searchQueries[0] ?? cleaned,
    searchQueries: searchQueries.length > 0 ? searchQueries : [cleaned],
    preferOpportunitiesCategory,
    preferTechniqueCategory,
    preferVenteCategory,
    language,
    isGreeting: detectGreeting(cleaned),
    isTooVague,
  };
}