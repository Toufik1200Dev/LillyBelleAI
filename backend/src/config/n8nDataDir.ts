import path from 'path';
import { env } from './env';

/**
 * Directory containing sharepoint_metadata.json, index.json, and search scripts.
 * Override with N8N_DATA_DIR when the server cwd is not the backend folder.
 */
export function getN8nDataDir(): string {
  if (env.N8N_DATA_DIR) {
    return path.resolve(env.N8N_DATA_DIR);
  }
  const inDist =
    __dirname.includes(`${path.sep}dist${path.sep}`) || __dirname.endsWith(`${path.sep}dist`);
  if (inDist) {
    return path.join(__dirname, '..', '..', 'src', 'n8n-data');
  }
  return path.join(__dirname, '..', 'n8n-data');
}
