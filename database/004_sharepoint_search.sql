-- ============================================================
-- 004_sharepoint_search.sql  –  SharePoint docs + FTS search
-- Run this in Supabase SQL Editor AFTER 001/002/003.
-- ============================================================

CREATE TABLE IF NOT EXISTS sharepoint_docs (
  id            BIGSERIAL PRIMARY KEY,
  external_id   TEXT UNIQUE,
  title         TEXT NOT NULL,
  folder        TEXT NOT NULL,
  url           TEXT NOT NULL,
  last_modified TIMESTAMPTZ,
  size_bytes    BIGINT,
  category      TEXT DEFAULT 'OTHER',
  search_text   TEXT GENERATED ALWAYS AS (
    coalesce(title, '') || ' ' || coalesce(folder, '') || ' ' || coalesce(category, '')
  ) STORED,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(folder, '') || ' ' || coalesce(category, '')
    )
  ) STORED,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_search_vector
  ON sharepoint_docs USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_last_modified
  ON sharepoint_docs (last_modified DESC);

CREATE INDEX IF NOT EXISTS idx_sharepoint_docs_category
  ON sharepoint_docs (category);

CREATE TRIGGER trg_sharepoint_docs_updated_at
  BEFORE UPDATE ON sharepoint_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  WITH query AS (
    SELECT websearch_to_tsquery('simple', coalesce(q, '')) AS tsq
  ),
  ranked AS (
    SELECT
      d.title,
      d.folder,
      d.url,
      d.last_modified AS "lastModified",
      d.size_bytes AS size,
      d.category,
      ts_rank_cd(d.search_vector, query.tsq) AS score
    FROM sharepoint_docs d
    CROSS JOIN query
    WHERE (
      (query.tsq <> ''::tsquery AND d.search_vector @@ query.tsq)
      OR d.title ILIKE '%' || q || '%'
      OR d.folder ILIKE '%' || q || '%'
    )
    AND (categories IS NULL OR array_length(categories, 1) IS NULL OR d.category = ANY(categories))
  )
  SELECT
    ranked.title,
    ranked.folder,
    ranked.url,
    ranked."lastModified",
    ranked.size,
    ranked.score,
    ranked.category
  FROM ranked
  ORDER BY ranked.score DESC, ranked."lastModified" DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(coalesce(lim, 15), 100));
$$;

-- Prefer applying 005_sharepoint_search_ranking.sql for stronger filename / PO-style ranking.
