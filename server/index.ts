import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import { requireSession, requireRole, limitAccountOperation } from './auth/access';
import { authRouter } from './auth/routes';
import { isDbConnected } from './config/db';
import { assessmentRouter } from './routes/assessmentRoutes';
import { communityRouter } from './routes/communityRoutes';
import { optimiserRouter } from './routes/optimiserRoutes';
import { auditRouter } from './routes/auditRoutes';
import { aiRouter } from './routes/aiRoutes';
import { supportRouter } from './routes/supportRoutes';

export const app = express();
app.disable('x-powered-by');
app.set('query parser', 'simple');

function trustedOrigins() {
  const origins = (process.env.TRUSTED_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  if (process.env.VERCEL_URL) origins.push('https://' + process.env.VERCEL_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push('https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  return origins;
}

app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  });
  res.vary('Origin');

  const origin = req.get('Origin');
  if (origin && !trustedOrigins().includes(origin)) {
    res.status(403).json({ success: false, error: 'Origin is not allowed.' });
    return;
  }
  if (origin) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Solaris-Request, X-Solaris-Account'
    });
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Solaris-Request') !== '1') {
    res.status(403).json({ success: false, error: 'Request verification failed.' });
    return;
  }
  next();
});

app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: { status: isDbConnected() ? 'connected' : 'disconnected' } });
});

app.use('/api/auth', authRouter);
app.use('/api/assessments', requireSession, assessmentRouter);
app.use('/api/community', requireSession, requireRole('employee', 'admin'), communityRouter);
app.use('/api/optimiser', requireSession, requireRole('employee', 'admin'), optimiserRouter);
app.use('/api/audit-logs', requireSession, requireRole('admin'), auditRouter);
app.use('/api/ai', requireSession, limitAccountOperation('assistant', 8, 30), aiRouter);
app.use('/api/support', requireSession, supportRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

export const handleApiError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const type = (error as { type?: unknown } | null)?.type;
  if (type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'Request body is too large.' });
    return;
  }
  if (type === 'entity.parse.failed' || type === 'request.size.invalid') {
    res.status(400).json({ success: false, error: 'Invalid JSON request.' });
    return;
  }
  if (type === 'encoding.unsupported' || type === 'charset.unsupported') {
    res.status(415).json({ success: false, error: 'Unsupported request encoding.' });
    return;
  }
  console.error('[Solaris API] Request processing failed.');
  res.status(500).json({ success: false, error: 'Internal server error.' });
};

app.use(handleApiError);
