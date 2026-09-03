import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Import routes
import apiKeysRouter from './routes/apiKeys.js';
import publicRouter from './routes/public.js';
import profileRouter from './routes/profile.js';
import securityRouter from './routes/security.js';
import organizationRouter from './routes/organization.js';
import billingRouter from './routes/billing.js';
import proxyRouter from './routes/proxy.js';
import analyticsRouter from './routes/analytics.js';
import adminRouter from './routes/admin.js';
import budgetsRouter from './routes/budgets.js';
import reportsRouter from './routes/reports.js';
import alertsRouter from './routes/alerts.js';
import alertRulesRouter from './routes/alertRules.js';
import platformKeysRouter from './routes/platformKeys.js';
import v1Router from './routes/v1.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Critical Startup Validation ---
// The server refuses to start if any production-required variable is missing.
// Accept either SUPABASE_URL or VITE_SUPABASE_URL for backward compat with
// local .env files (seed scripts, migrate scripts) that may use the VITE_ prefix.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  console.error('[startup] FATAL: SUPABASE_URL (or VITE_SUPABASE_URL) is missing. Backend cannot start.');
  process.exit(1);
}

const REQUIRED_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'FRONTEND_URL',
  'CREDENTIAL_ENCRYPTION_KEY',
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`[startup] FATAL: ${envVar} is missing from environment variables. Backend cannot start.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// --- Supabase Client ---
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- Security Headers (helmet) ---
// Adds: X-Content-Type-Options: nosniff, X-Frame-Options: DENY,
// Strict-Transport-Security (max-age 1 year), X-XSS-Protection,
// Referrer-Policy, and Content-Security-Policy.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", process.env.FRONTEND_URL],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co', process.env.FRONTEND_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// --- CORS ---
// FRONTEND_URL is validated above so it is always set at this point.
// No wildcard fallback — intentional.
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// --- Auth Middleware: Supabase Session ---
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if the user is active in the users table
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError) {
      console.warn('[requireAuth] Failed to verify user active status:', dbError.message);
      // Fail open on DB error as per plan
    } else if (dbUser && !dbUser.is_active) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[requireAuth] Error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// --- Auth Middleware: Platform API Key ---
// Verify a Platform Key (ii_sk_live_...) for the public /v1 gateway.
// Unlike requireAuth, this is NOT a Supabase session — it is a long-lived key
// a user pastes into their own external code. We hash the presented key and
// look it up in api_keys; we never store or compare plain-text keys.
export const requirePlatformKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token || !token.startsWith('ii_sk_')) {
    return res.status(401).json({ error: { message: 'Invalid API key provided.', type: 'invalid_request_error' } });
  }

  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: keyRow, error } = await supabase
    .from('api_keys')
    .select('id, organization_id, integration_id, is_active, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !keyRow || !keyRow.is_active) {
    return res.status(401).json({ error: { message: 'Invalid or revoked API key.', type: 'invalid_request_error' } });
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return res.status(401).json({ error: { message: 'This API key has expired.', type: 'invalid_request_error' } });
  }

  req.platformKey = keyRow;
  next();
};

// --- Rate Limiters ---

// AI proxy: 60 req/min per IP (existing, unchanged)
const proxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many proxy requests from this IP, please try again after a minute' }
});

// External /v1 gateway: 60 req/min per IP (existing, unchanged)
const v1Limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Rate limit exceeded. Please retry after a minute.', type: 'rate_limit_error' } }
});

// Security/2FA/Sessions: 5 req/min per IP.
// Covers: /track-login, /2fa/*, /sessions/*, /login-history.
// 5/min allows a full 2FA enrollment flow (start, verify, backup codes = 3
// requests) without blocking legitimate users while preventing brute-force.
const securityLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many security requests from this IP, please try again after a minute' }
});

// --- Routes ---
app.use('/api/public', publicRouter);
app.use('/api/api-keys', requireAuth, apiKeysRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/security', requireAuth, securityLimiter, securityRouter);
app.use('/api/organization', requireAuth, organizationRouter);
app.use('/api/billing', requireAuth, billingRouter);
app.use('/api/proxy', requireAuth, proxyLimiter, proxyRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/alerts', requireAuth, alertsRouter);
app.use('/api/alert-rules', requireAuth, alertRulesRouter);
app.use('/api/platform-keys', requireAuth, platformKeysRouter);

// Public external gateway — NOT requireAuth. Callers authenticate with a
// Platform Key (ii_sk_live_...) instead of a Supabase session.
app.use('/v1', v1Limiter, requirePlatformKey, v1Router);

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- Global Error Handler ---
// Catches errors passed via next(err). Rules:
//   - Logs full error (message + stack) server-side for debugging.
//   - Returns a generic message + correlationId to the client.
//   - NEVER returns stack traces, DB messages, file paths, or secrets.
// Intentional business errors (400/401/403/404/409/validation/entitlement)
// are handled inside each route and bypass this handler entirely.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const correlationId = crypto.randomUUID();
  console.error(`[error] correlationId=${correlationId}`, err.message, err.stack);
  res.status(500).json({
    error: 'An internal server error occurred.',
    correlationId,
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
