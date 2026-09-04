import rateLimit from 'express-rate-limit';

// AI proxy & alert checks: 60 req/min per IP
export const proxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many proxy requests from this IP, please try again after a minute' }
});

// External /v1 gateway: 60 req/min per IP
export const v1Limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Rate limit exceeded. Please retry after a minute.', type: 'rate_limit_error' } }
});

// Security/2FA/Sessions: 5 req/min per IP
export const securityLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many security requests from this IP, please try again after a minute' }
});
