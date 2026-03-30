-- ============================================================
-- 006_sharepoint_search_safe_ts.sql
-- Run in Supabase after 005. Fixes empty / invalid tsquery handling
-- so ILIKE matches still work and ts_rank_cd does not break scans.
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
