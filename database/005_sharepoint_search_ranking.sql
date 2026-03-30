-- ============================================================
-- 005_sharepoint_search_ranking.sql
-- Run in Supabase SQL Editor after 004. Replaces search_sharepoint_docs
-- to strongly boost exact / prefix / substring title matches (PO-style names).
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
    SELECT btrim(coalesce(q, '')) AS qq
  ),
  ts AS (
    SELECT
      websearch_to_tsquery('simple', (SELECT qq FROM qnorm)) AS tsq,
      (SELECT qq FROM qnorm) AS qq
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
      ts_rank_cd(d.search_vector, ts.tsq) AS tr
    FROM sharepoint_docs d
    CROSS JOIN ts
    WHERE (categories IS NULL OR array_length(categories, 1) IS NULL OR d.category = ANY(categories))
      AND (
        (ts.tsq IS NOT NULL AND ts.tsq <> ''::tsquery AND d.search_vector @@ ts.tsq)
        OR (length(ts.qq) > 0 AND d.title ILIKE '%' || ts.qq || '%')
        OR (length(ts.qq) > 0 AND d.folder ILIKE '%' || ts.qq || '%')
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
