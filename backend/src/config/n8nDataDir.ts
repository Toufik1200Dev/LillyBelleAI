import path from 'path';
import { env } from './env';

/**
 * Directory containing sharepoint_metadata.json, index.json, and *.js search modules.
 * - Development (ts-node): src/n8n-data (sibling of src/config).
 * - Production (node dist/server.js): dist/n8n-data (populated by `npm run build`).
 * Override with N8N_DATA_DIR for a persistent disk path on Render.
 */
export function getN8nDataDir(): string {
  if (env.N8N_DATA_DIR) {
    return path.resolve(env.N8N_DATA_DIR);
  }
  return path.join(__dirname, '..', 'n8n-data');
}
