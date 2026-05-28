-- ============================================================
-- 007_sharepoint_search_perf.sql
-- Performance tuning for large SharePoint corpora.
-- Run in Supabase SQL Editor after 006.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes speed up ILIKE '%...%' predicates.
CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_title_trgm
  ON sharepoint_docs USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_folder_trgm
  ON sharepoint_docs USING GIN (folder gin_trgm_ops);

-- Composite index helps ORDER BY ... last_modified DESC with category filtering.
CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_category_lastmod
  ON sharepoint_docs (category, last_modified DESC);

ANALYZE sharepoint_docs;

CREATE OR REPLACE FUNCTION search_sharepoint_docs(
  q TEXT,
  categories TEXT[] DEFAULT NULL,
  lim INT DEFAULT 15
)
RETURNS TABLE (
  title TEXT,
  folder TEXT,
  url TEXT,
  "lastModified" TIMESTAMPTZ,
  size BIGINT,
  score DOUBLE PRECISION,
  category TEXT
)
LANGUAGE SQL
STABLE
AS $$
  WITH qnorm AS (
    SELECT btrim(coalesce(q, '')) AS qq
  ),
  ts AS (
    SELECT
      (SELECT qq FROM qnorm) AS qq,
      CASE
        WHEN length((SELECT qq FROM qnorm)) = 0 THEN ''::tsquery
        ELSE websearch_to_tsquery('simple', (SELECT qq FROM qnorm))
      END AS tsq
  ),
  matched AS (
    SELECT
      d.title,
      d.folder,
      d.url,
      d.last_modified AS "lastModified",
      d.size_bytes AS size,
      d.category,
      ts.qq,
      CASE
        WHEN length(ts.qq) = 0 THEN 0::double precision
        WHEN lower(d.title) = lower(ts.qq) THEN 1e6::double precision
        WHEN d.title ILIKE ts.qq || '%' THEN 5e5::double precision
        WHEN d.title ILIKE '%' || ts.qq || '%' THEN 2e5::double precision
        WHEN d.folder ILIKE '%' || ts.qq || '%' THEN 8e4::double precision
        ELSE 0::double precision
      END AS match_bonus,
      CASE
        WHEN ts.tsq IS NULL OR ts.tsq = ''::tsquery THEN 0::double precision
        ELSE ts_rank_cd(d.search_vector, ts.tsq)
      END AS tr
    FROM sharepoint_docs d
    CROSS JOIN ts
    WHERE (categories IS NULL OR array_length(categories, 1) IS NULL OR d.category = ANY(categories))
      AND length(ts.qq) > 0
      AND (
        (ts.tsq <> ''::tsquery AND d.search_vector @@ ts.tsq)
        OR d.title ILIKE '%' || ts.qq || '%'
        OR d.folder ILIKE '%' || ts.qq || '%'
      )
  )
  SELECT
    matched.title,
    matched.folder,
    matched.url,
    matched."lastModified",
    matched.size,
    (matched.match_bonus + coalesce(matched.tr, 0) * 1000)::double precision AS score,
    matched.category
  FROM matched
  ORDER BY score DESC, matched."lastModified" DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(coalesce(lim, 15), 100));
$$;

