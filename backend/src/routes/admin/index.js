import express from 'express';
import { requirePlatformAdmin } from '../../middleware/requirePlatformAdmin.js';
import authRouter from './auth.js';
import pricingRouter from './pricing.js';
import organizationsRouter from './organizations.js';
import systemRouter from './system.js';
import analyticsRouter from './analytics.js';
import usersRouter from './users.js';
import budgetsRouter from './budgets.js';
import integrationsRouter from './integrations.js';
import reportsRouter from './reports.js';
import siteLinksRouter from './siteLinks.js';

const router = express.Router();

/**
 * Admin router — single mount point for all /api/admin/* sub-routes.
 *
 * Middleware stack (in order, for every /api/admin/* request):
 *   1. requireAuth       — applied in index.js, sets req.user
 *   2. requirePlatformAdmin — applied HERE, checks is_platform_admin from DB
 *   3. Sub-router handlers
 *
 * Do NOT apply requirePlatformAdmin anywhere else (not in index.js, not in
 * individual route files). This single line is the authoritative gate.
 */
router.use(requirePlatformAdmin);

// Sub-routers — mounted after the platform-admin gate
router.use('/auth', authRouter);
router.use('/pricing', pricingRouter);
router.use('/organizations', organizationsRouter);
router.use('/system', systemRouter);
router.use('/analytics', analyticsRouter);
router.use('/users', usersRouter);
router.use('/budgets', budgetsRouter);
router.use('/integrations', integrationsRouter);
router.use('/reports', reportsRouter);
router.use('/site-links', siteLinksRouter);

export default router;
