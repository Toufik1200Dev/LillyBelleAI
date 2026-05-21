#!/usr/bin/env bash
# Render start: optionally fetch SharePoint JSON from Storage; never fail deploy on curl/DNS errors.
# Live search uses Supabase RPC (search_sharepoint_docs) — the JSON file is only for /reindex.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

DATA_DIR="${N8N_DATA_DIR:-/tmp/n8n}"
DATA_FILE="${DATA_DIR}/sharepoint_metadata.json"
PARTS=(
  "sharepoint_metadata.valid.part01.json"
  "sharepoint_metadata.valid.part02.json"
  "sharepoint_metadata.valid.part03.json"
)

maybe_download_metadata() {
  if [[ -f "${DATA_FILE}" ]]; then
    echo "[render-start] Using existing ${DATA_FILE}"
    return 0
  fi

  if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "[render-start] Skip metadata download (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset)."
    return 0
  fi

  if [[ "${SUPABASE_URL}" == *"your-project"* ]]; then
    echo "[render-start] Skip metadata download (SUPABASE_URL is still a placeholder)."
    return 0
  fi

  local base="${SUPABASE_URL%/}"
  mkdir -p "${DATA_DIR}" || return 0

  echo "[render-start] Trying metadata download from Supabase Storage → ${DATA_DIR}..."

  local tmp_dir="${DATA_DIR}/.parts"
  mkdir -p "${tmp_dir}"
  local i=0
  for part in "${PARTS[@]}"; do
    i=$((i + 1))
    local out="${tmp_dir}/p${i}"
    if ! curl -fL --connect-timeout 30 --max-time 300 \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      "${base}/storage/v1/object/sharepoint-metadata/${part}" \
      -o "${out}"; then
      echo "[render-start] WARN: Could not download ${part}."
      echo "[render-start] Check SUPABASE_URL in Render (Settings → API → Project URL). DNS must resolve."
      echo "[render-start] Starting server anyway — search API uses Supabase DB, not this file."
      rm -rf "${tmp_dir}"
      return 0
    fi
  done

  cat "${tmp_dir}"/p1 "${tmp_dir}"/p2 "${tmp_dir}"/p3 > "${DATA_FILE}"
  rm -rf "${tmp_dir}"
  echo "[render-start] Wrote ${DATA_FILE}"
}

maybe_download_metadata

exec npm start
