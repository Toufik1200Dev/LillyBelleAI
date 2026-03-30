import { supabaseAdmin } from '../config/supabase';

export interface SharepointSearchHit {
  title: string;
  folder: string;
  url: string;
  lastModified: string | null;
  size: number | null;
  score: number;
  category: string;
}

export async function searchSharepointDocs(
  query: string,
  categories?: string[],
  limit = 15
): Promise<SharepointSearchHit[]> {
  const { data, error } = await supabaseAdmin.rpc('search_sharepoint_docs', {
    q: query,
    categories: categories && categories.length > 0 ? categories : null,
    lim: Math.min(100, Math.max(1, limit)),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SharepointSearchHit[];
}
