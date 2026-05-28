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

type ImportRow = {
  external_id: string;
  title: string;
  folder: string;
  url: string;
  last_modified: string | null;
  size_bytes: number | null;
  category: string;
};

type ImportOptions = {
  inputFiles: string[];
  since: Date | null;
  chunkSize: number;
};

function inferCategory(file: SharepointFile): string {
  const folder = file.folder || '';
  const title = file.title || '';
  const haystack = `${folder} ${title}`;
  if (/po[\s_]*client|06_po\s*client|_po\s*client/i.test(folder)) return 'PO_CLIENT';
  if (/po[\s_]*fournis|07_po/i.test(folder)) return 'PO_FOURNISSEUR';
  if (/opportunit/i.test(haystack)) return 'OPPORTUNITIES';
  if (/(^|[/\\\s])rh($|[/\\\s])/i.test(haystack)) return 'RH';
  return 'OTHER';
}

function normalizeRow(file: SharepointFile): ImportRow | null {
  const title = String(file.title ?? '').trim();
  const url = String(file.url ?? '').trim();
  if (!title || !url) return null;
  const folder = String(file.folder ?? '').trim();
  const sizeValue = Number(file.size);
  const size = Number.isFinite(sizeValue) && sizeValue >= 0 ? Math.round(sizeValue) : null;
  const lastModified = file.lastModified ? new Date(file.lastModified).toISOString() : null;
  return {
    external_id: `${url}|${title}`,
    title,
    folder,
    url,
    last_modified: lastModified,
    size_bytes: size,
    category: inferCategory({ ...file, title, folder, url }),
  };
}

function parseArgs(): ImportOptions {
  // Support:
  // 1) --input file1.json,file2.json
  // 2) positional paths
  // 3) --since=2026-03-01T00:00:00Z (incremental import)
  // 4) --chunk=2000
  const args = process.argv.slice(2);
  const inputFlag = args.find((a) => a.startsWith('--input='));
  const sinceFlag = args.find((a) => a.startsWith('--since='));
  const chunkFlag = args.find((a) => a.startsWith('--chunk='));
  const chunkParsed = chunkFlag ? parseInt(chunkFlag.slice('--chunk='.length), 10) : 2000;
  const chunkSize = Number.isFinite(chunkParsed) ? Math.max(100, Math.min(10000, chunkParsed)) : 2000;
  let since: Date | null = null;
  if (sinceFlag) {
    const raw = sinceFlag.slice('--since='.length).trim();
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid --since value: ${raw}. Use ISO date, e.g. --since=2026-03-01T00:00:00Z`);
    }
    since = parsed;
  }

  const base = (): string[] => {
    if (inputFlag) {
      return inputFlag
        .slice('--input='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => path.resolve(p));
    }
    const positional = args.filter((a) => !a.startsWith('--'));
    if (positional.length > 0) {
      return positional.map((p) => path.resolve(p));
    }
    return [path.join(__dirname, '..', 'n8n-data', 'sharepoint_metadata.json')];
  };

  return {
    inputFiles: base(),
    since,
    chunkSize,
  };
}

function isNewerThan(file: SharepointFile, since: Date | null): boolean {
  if (!since) return true;
  if (!file.lastModified) return false;
  const ts = new Date(file.lastModified).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= since.getTime();
}

function filterFiles(files: SharepointFile[], since: Date | null): SharepointFile[] {
  if (!since) return files;
  return files.filter((f) => isNewerThan(f, since));
}

function estimateProgress(total: number, processed: number): string {
  const pct = total === 0 ? 100 : Math.min(100, Math.round((processed / total) * 100));
  return `${processed}/${total} (${pct}%)`;
}

function readExportFile(filePath: string): ExportPayload {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as ExportPayload;
  if (!Array.isArray(parsed.files)) {
    throw new Error(`Invalid export at ${filePath}: files[] missing`);
  }
  return parsed;
}

async function upsertChunk(rows: ImportRow[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from('sharepoint_docs')
    .upsert(rows, { onConflict: 'external_id' });
  if (error) throw new Error(error.message);
}

async function main() {
  const { inputFiles, since, chunkSize } = parseArgs();
  console.log(
    `[importSharepointDocs] options: files=${inputFiles.length}, chunk=${chunkSize}, since=${
      since ? since.toISOString() : 'none (full refresh)'
    }`
  );
  let importedTotal = 0;
  let scannedTotal = 0;
  for (const filePath of inputFiles) {
    const parsed = readExportFile(filePath);
    scannedTotal += parsed.files.length;
    const selectedFiles = filterFiles(parsed.files, since);
    console.log(
      `[importSharepointDocs] ${filePath}: selected ${selectedFiles.length}/${parsed.files.length} rows`
    );
    let importedThisFile = 0;
    for (let i = 0; i < selectedFiles.length; i += chunkSize) {
      const chunkRows = selectedFiles
        .slice(i, i + chunkSize)
        .map(normalizeRow)
        .filter((v): v is ImportRow => Boolean(v));
      if (chunkRows.length === 0) continue;
      await upsertChunk(chunkRows);
      importedThisFile += chunkRows.length;
      importedTotal += chunkRows.length;
      if (importedThisFile % 20000 === 0) {
        console.log(
          `[importSharepointDocs] progress ${estimateProgress(selectedFiles.length, importedThisFile)}`
        );
      }
    }
    console.log(`[importSharepointDocs] completed ${filePath} (${importedThisFile} rows upserted)`);
  }

  console.log(
    `[importSharepointDocs] done. Scanned=${scannedTotal}, imported/updated=${importedTotal}, mode=${
      since ? 'incremental' : 'full'
    }`
  );
}

main().catch((err) => {
  console.error('[importSharepointDocs] failed:', err);
  process.exit(1);
});
