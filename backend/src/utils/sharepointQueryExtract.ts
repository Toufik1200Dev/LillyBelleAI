/**
 * Extract a file / PO-style code from free text so SharePoint search matches titles.
 * Example: "donne moi le fichier : 250409_NARDA_PO_BCLBH00010" → "250409_NARDA_PO_BCLBH00010"
 */
export function resolveSharepointSearchQuery(raw: string): { resolved: string; original: string } {
  const original = raw.replace(/\s+/g, ' ').trim();
  if (!original) return { resolved: original, original };

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
