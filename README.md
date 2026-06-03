# LillyBelle AI Assistant

A production-ready, ChatGPT-style web application that serves as the LillyBelle enterprise AI assistant. The system strictly answers questions based on your data — no hallucinations, always sourced.

## Architecture

```
┌─────────────────┐     REST API      ┌─────────────────┐     Webhook      ┌─────────────┐
│  React Frontend │ ────────────────► │ Express Backend │ ──────────────► │  n8n + AI   │
│  (Vite + TS)    │                   │  (Node + TS)    │                  │  SharePoint │
└─────────────────┘                   └─────────────────┘                  └─────────────┘
         │                                     │
         └──────────── Supabase Auth ───────────┘
                        + PostgreSQL DB
```

## Project Structure

```
zohoCRM/
├── frontend/          # React 18 + Vite + TypeScript + Tailwind
├── backend/           # Express + TypeScript API proxy
├── database/          # SQL migration files
│   ├── 001_schema.sql
│   ├── 002_rls.sql
│   └── 003_functions.sql
└── README.md
```

## Quick Start

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the migrations **in order**:
   ```
   database/001_schema.sql   ← tables
   database/002_rls.sql      ← row level security
   database/003_functions.sql ← triggers
   ```
3. Go to **Settings → API** and copy your Project URL and anon/service-role keys

### 2. n8n Setup

1. Deploy n8n (self-hosted or [n8n.cloud](https://n8n.cloud))
2. Create a workflow with:
   - **Webhook** trigger node (POST method)
   - **Microsoft Graph** node for SharePoint search
   - **AI Agent** node (GPT-4 / Claude) with the strict system prompt below
   - **Respond to Webhook** node returning:
     ```json
     { "success": true, "response": "...", "metadata": { "sources": [] } }
     ```
3. Set optional **API Key** authentication on the webhook
4. Copy the webhook URL

**System Prompt for n8n AI Node:**
```
You are a company AI assistant. You MUST ONLY answer questions based on the provided SharePoint documents.

STRICT RULES:
1. If the answer is not in the provided context, say "I don't have information about that in our company documents."
2. NEVER make up or infer information not explicitly stated in the documents
3. Always cite the source document (title + URL)
4. Be concise and professional

Context from SharePoint:
{{context}}

User Question:
{{question}}
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env         # Fill in your values
npm install
npm run seed                 # Creates a test user (test@example.com / password123)
npm run dev                  # Runs on http://localhost:3000
```

**Required** environment variables:
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never expose publicly) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (server-side only, never expose in frontend) |
| `CLAUDE_MODEL` | Claude model id (default: `claude-sonnet-4-20250514`) |
| `CORS_ORIGIN` | Frontend URL (default: `http://localhost:5173`) |

Optional legacy variables (only if keeping fallback n8n path): `N8N_WEBHOOK_URL`, `N8N_API_KEY`.

### Import large SharePoint JSON parts

For split exports (for example 3 files of ~50MB each), import all parts directly:

```bash
cd backend
npm run import-sharepoint-docs -- "../../Downloads/sharepoint_metadata.valid.part01.json" "../../Downloads/sharepoint_metadata.valid.part02.json" "../../Downloads/sharepoint_metadata.valid.part03.json"
```

The importer upserts in chunks and accepts multiple input files.

For faster refreshes, use incremental mode (only changed files since a timestamp):

```bash
npm run import-sharepoint-docs -- --since=2026-03-01T00:00:00Z "../../Downloads/sharepoint_metadata.valid.part01.json" "../../Downloads/sharepoint_metadata.valid.part02.json" "../../Downloads/sharepoint_metadata.valid.part03.json"
```

You can tune chunk size (default `2000`) if needed:

```bash
npm run import-sharepoint-docs -- --chunk=3000 "../../Downloads/sharepoint_metadata.valid.part01.json"
```

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env         # Fill in your values
npm install
npm run dev                  # Runs on http://localhost:5173
```

**Required** environment variables:
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (default: `http://localhost:3000/api`) |

### Deploy backend on Render

1. **Start command** (replace any long inline `curl` bash one-liner):
   ```bash
   bash scripts/render-start.sh
   ```
   Root directory: `backend`. Build: `npm install && npm run build`.

2. **`SUPABASE_URL`** must be the exact **Project URL** from Supabase → Settings → API (e.g. `https://abcdefgh.supabase.co`). If DNS cannot resolve the host, fix the URL — a typo will break auth, search, and optional metadata download.

3. SharePoint **search** uses the **Supabase database** (`search_sharepoint_docs`). Downloading `sharepoint_metadata.json` at startup is **optional** (only for `/reindex`).

4. Or use the repo **`render.yaml`** blueprint at the project root.

**Login fails with `ERR_NAME_NOT_RESOLVED` / `your-project.supabase.co`:**  
`VITE_*` variables are baked in at **build** time. Replace placeholders in `frontend/.env` with your real **Project URL** and **anon** key from Supabase, run `npm run dev` again locally, or rebuild (`npm run build`) before deploying Firebase Hosting.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| PATCH | `/api/conversations/:id` | Rename / archive |
| DELETE | `/api/conversations/:id` | Delete |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/chat` | Send message → AI response |

## Security

- **RLS policies** ensure users can only access their own data
- **Service-role key** stays server-side only
- **Rate limiting**: 20 requests/minute per user
- **Helmet.js** sets secure HTTP headers
- **Token validation** on every API request

## Deployment

**Frontend** → Vercel / Netlify  
**Backend** → Railway / Render / Heroku  
**Database** → Supabase (managed)  
**AI Workflow** → n8n cloud or self-hosted

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State | React Context API + custom hooks |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) with RLS |
| Backend | Express.js, TypeScript, Helmet, Zod |
| AI Workflow | n8n with Microsoft Graph + OpenAI/Claude |
