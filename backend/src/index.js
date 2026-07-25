import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Import routes
import apiKeysRouter from './routes/apiKeys.js';
import publicRouter from './routes/public.js';
import profileRouter from './routes/profile.js';
import securityRouter from './routes/security.js';
import organizationRouter from './routes/organization.js';
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

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables. Backend cannot start without it.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Middlewares
app.use(cors());
app.use(express.json());

// Auth Middleware: Verify Supabase JWT
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Enforce account deactivation platform-wide. Without this check, an
  // admin deactivating a user in the Admin Panel would only be cosmetic —
  // the user's existing session would keep working on every API route.
  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!dbUserError && dbUser && dbUser.is_active === false) {
    return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
  }

  req.user = data.user;
  next();
};

// Auth Middleware: Verify a Platform Key (ii_sk_live_...) for the public
// /v1 gateway. Unlike requireAuth, this is NOT a Supabase session — it's a
// long-lived key a user pastes into their own external code. We hash the
// presented key and look it up in api_keys; we never store or compare
// plain-text keys.
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

// Rate Limiter for proxy endpoints
const proxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per `window` (here, per minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many proxy requests from this IP, please try again after a minute' }
});

// Rate Limiter for the external /v1 gateway — keyed the same way as the
// internal proxy. External callers get the same per-IP ceiling for now;
// per-key limits can be layered on top later without touching this.
const v1Limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Rate limit exceeded. Please retry after a minute.', type: 'rate_limit_error' } }
});

// Routes
app.use('/api/public', publicRouter);
app.use('/api/api-keys', requireAuth, apiKeysRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/security', requireAuth, securityRouter);
app.use('/api/organization', requireAuth, organizationRouter);
app.use('/api/proxy', requireAuth, proxyLimiter, proxyRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/budgets', requireAuth, budgetsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/alerts', requireAuth, alertsRouter);
app.use('/api/alert-rules', requireAuth, alertRulesRouter);
app.use('/api/platform-keys', requireAuth, platformKeysRouter);

// Public external gateway — NOT requireAuth. Callers authenticate with a
// Platform Key (ii_sk_live_...) instead of a Supabase session, so this uses
// requirePlatformKey + its own rate limiter instead.
app.use('/v1', v1Limiter, requirePlatformKey, v1Router);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
