import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { authMiddleware, AuthRequest } from './middleware/authMiddleware';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import conversationsRouter from './routes/conversations';
import chatRouter from './routes/chat';
import {
  postSharePointReindex,
  postSharePointSearch,
} from './controllers/sharePointSearchController';

const app = express();

// ─── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Search-Key'],
}));

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check (no auth required) ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SharePoint metadata search (n8n / automation, no user JWT) ───────────────
app.post('/api/internal/sharepoint-search', postSharePointSearch);
app.post('/api/internal/sharepoint-search/reindex', postSharePointReindex);

// ─── Auth + Rate limit all /api routes ───────────────────────────────────────
app.use('/api', authMiddleware as express.RequestHandler);
app.use('/api', rateLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/conversations', conversationsRouter);
app.use('/api/chat', chatRouter);

// ─── Auth me ───────────────────────────────────────────────────────────────────
app.get('/api/auth/me', (req, res) => {
  const authReq = req as AuthRequest;
  res.json({ success: true, data: { id: authReq.userId, email: authReq.userEmail } });
});

// ─── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable' });
});

// ─── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler as express.ErrorRequestHandler);

// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   CORS origin : ${env.CORS_ORIGIN}`);
  console.log(`   n8n webhook : ${env.N8N_WEBHOOK_URL || '⚠️  not set'}\n`);
});

export default app;
