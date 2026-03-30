import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../config/supabase';

type SharepointFile = {
  title: string;
  folder: string;
  url: string;
  lastModified?: string;
  size?: number;
};

type ExportPayload = {
  files: SharepointFile[];
};

function inferCategory(file: SharepointFile): string {
  const folder = file.folder || '';
  if (/po[\s_]*client|06_po\s*client|_po\s*client/i.test(folder)) return 'PO_CLIENT';
  if (/po[\s_]*fournis|07_po/i.test(folder)) return 'PO_FOURNISSEUR';
  if (/opportunit/i.test(folder)) return 'OPPORTUNITIES';
  if (/(^|[/\\\s])rh($|[/\\\s])/i.test(folder)) return 'RH';
  return 'OTHER';
}

async function upsertChunk(rows: Array<Record<string, unknown>>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sharepoint_docs')
    .upsert(rows, { onConflict: 'external_id' });
  if (error) throw new Error(error.message);
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'n8n-data', 'sharepoint_metadata.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Missing file: ${dataPath}`);
  }
  const raw = fs.readFileSync(dataPath, 'utf8');
  const parsed = JSON.parse(raw) as ExportPayload;
  if (!Array.isArray(parsed.files)) {
    throw new Error('Invalid export: files[] missing');
  }

  const chunkSize = 1000;
  let inserted = 0;
  for (let i = 0; i < parsed.files.length; i += chunkSize) {
    const chunk = parsed.files.slice(i, i + chunkSize).map((f) => ({
      external_id: `${f.url}|${f.title}`,
      title: f.title,
      folder: f.folder || '',
      url: f.url,
      last_modified: f.lastModified ?? null,
      size_bytes: f.size ?? null,
      category: inferCategory(f),
    }));
    await upsertChunk(chunk);
    inserted += chunk.length;
    if (inserted % 10000 === 0) {
      console.log(`Imported ${inserted}/${parsed.files.length} documents...`);
    }
  }

  console.log(`Done. Imported/updated ${inserted} documents.`);
}

main().catch((err) => {
  console.error('[importSharepointDocs] failed:', err);
  process.exit(1);
});
