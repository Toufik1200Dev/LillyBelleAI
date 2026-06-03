/**
 * Extract a file / PO-style code from free text so SharePoint search matches titles.
 * Example: "donne moi le fichier : 250409_NARDA_PO_BCLBH00010" → "250409_NARDA_PO_BCLBH00010"
 */

/**
 * Matches opportunity refs with any separator variant:
 * 2601-d7691 | 2601/d7691 | 2601_d7691 | 2601 - d7691 | 2601 / d7691
 * Captures left (YYYY) and right (suffix) as separate groups so we can normalise.
 */
const OPPORTUNITY_REF = /\b(\d{4})\s*[-\/_]\s*([a-z0-9]{3,})\b/i;

/** Normalise any separator variant to the canonical hyphenated form: "2601-d7691" */
function normalizeOpportunityRef(left: string, right: string): string {
  return `${left}-${right}`.toLowerCase();
}

export function resolveSharepointSearchQuery(raw: string): { resolved: string; original: string } {
  const original = raw.replace(/\s+/g, ' ').trim();
  if (!original) return { resolved: original, original };

  const opportunity = original.match(OPPORTUNITY_REF);
  if (opportunity) {
    return { resolved: normalizeOpportunityRef(opportunity[1], opportunity[2]), original };
  }

  const parts = original.split(':').map((p) => p.trim()).filter((p) => p.length > 0);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].replace(/[.,;]+$/, '').trim();
    if (p.length >= 6 && /\d/.test(p)) {
      return { resolved: p, original };
    }
  }

  const datedUnderscore = original.match(/\b\d{6}_[A-Z0-9_]+\b/i);
  if (datedUnderscore) return { resolved: datedUnderscore[0], original };

  const underscored = original.match(/\b[A-Z0-9](?:[A-Z0-9_]){8,}\b/i);
  if (underscored) return { resolved: underscored[0], original };

  return { resolved: original, original };
}
