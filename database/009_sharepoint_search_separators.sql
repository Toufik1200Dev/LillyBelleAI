-- ============================================================
-- 009_sharepoint_search_separators.sql
-- Normalise all separator characters (- _ /) to a space before
-- comparing query vs title/folder, so "2601-d7691", "2601_d7691",
-- and "2601/d7691" all match the same documents.
-- Run in Supabase SQL Editor after 008.
-- ============================================================

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
    -- Canonical query: collapse all separators (- _ /) to a single space
    SELECT
      btrim(coalesce(q, '')) AS qq,
      btrim(lower(translate(coalesce(q, ''), '-_/', '   '))) AS qq_flat
  ),
  ts AS (
    SELECT
      qq,
      qq_flat,
      CASE
        WHEN length(qq) = 0 THEN ''::tsquery
        ELSE websearch_to_tsquery('simple', qq)
      END AS tsq
    FROM qnorm
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
      ts.qq_flat,
      -- title_flat: separators normalised to space, for flat comparisons
      lower(translate(d.title, '-_/', '   ')) AS title_flat,
      lower(translate(d.folder, '-_/', '   ')) AS folder_flat,
      CASE
        WHEN length(ts.qq) = 0 THEN 0::double precision
        -- Exact match (original or flat)
        WHEN lower(d.title) = lower(ts.qq)  THEN 1e6::double precision
        WHEN lower(translate(d.title, '-_/', '   ')) = ts.qq_flat THEN 1e6::double precision
        -- Prefix match
        WHEN d.title ILIKE ts.qq || '%'      THEN 5e5::double precision
        WHEN lower(translate(d.title, '-_/', '   ')) LIKE ts.qq_flat || '%' THEN 5e5::double precision
        -- Substring in title (any separator form)
        WHEN lower(translate(d.title, '-_/', '   ')) LIKE '%' || ts.qq_flat || '%' THEN 2e5::double precision
        -- Substring in folder
        WHEN lower(translate(d.folder, '-_/', '   ')) LIKE '%' || ts.qq_flat || '%' THEN 8e4::double precision
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
        -- Full-text search on original
        (ts.tsq <> ''::tsquery AND d.search_vector @@ ts.tsq)
        -- Flat-normalised substring match on title or folder
        OR lower(translate(d.title,  '-_/', '   ')) LIKE '%' || ts.qq_flat || '%'
        OR lower(translate(d.folder, '-_/', '   ')) LIKE '%' || ts.qq_flat || '%'
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
