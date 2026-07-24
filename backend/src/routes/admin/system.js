import express from 'express';
import os from 'os';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/system/health ────────────────────────────────────────────
// Returns current Node.js server health, DB connectivity, and key configuration.
router.get('/health', async (req, res) => {
  try {
    const health = {
      server: {
        uptime_seconds: process.uptime(),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
        cpus: os.cpus().length,
        load_average: os.loadavg(),
        platform: os.platform()
      },
      database: {
        status: 'unknown',
        supabase_connected: false,
        latency_ms: 0
      },
      security: {
        encryption_key_loaded: !!process.env.CREDENTIAL_ENCRYPTION_KEY
      },
      kpis: {
        active_integrations_count: 0
      },
      timestamp: new Date().toISOString()
    };

    // Ping Supabase DB
    const start = Date.now();
    const { data: pingData, error } = await supabase.from('users').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      health.database.status = 'error';
      health.database.error = error.message;
      health.database.supabase_connected = false;
    } else {
      health.database.status = 'healthy';
      health.database.latency_ms = latency;
      health.database.supabase_connected = true;
    }

    // Fetch active integrations count
    const { count: integrationsCount, error: intErr } = await supabase
      .from('ai_integrations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
      
    if (!intErr && integrationsCount !== null) {
      health.kpis.active_integrations_count = integrationsCount;
    }

    res.json({ data: health });
  } catch (err) {
    console.error('[admin/system] GET /health error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve system health.' });
  }
});

// ─── GET /api/admin/system/audit-log ─────────────────────────────────────────
// Returns global audit logs for all organizations and platform actions.
router.get('/audit-log', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        new_values,
        old_values,
        ip_address,
        organization_id,
        user_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
    const orgIds = [...new Set((logs || []).map(l => l.organization_id).filter(Boolean))];

    const [usersRes, orgsRes] = await Promise.all([
      userIds.length
        ? supabase.from('users').select('id, email, full_name').in('id', userIds)
        : { data: [] },
      orgIds.length
        ? supabase.from('organizations').select('id, name, slug').in('id', orgIds)
        : { data: [] }
    ]);

    const usersMap = new Map((usersRes.data || []).map(u => [u.id, u]));
    const orgsMap = new Map((orgsRes.data || []).map(o => [o.id, o]));

    const data = (logs || []).map(log => ({
      ...log,
      users: log.user_id ? (usersMap.get(log.user_id) || null) : null,
      organizations: log.organization_id ? (orgsMap.get(log.organization_id) || null) : null
    }));

    res.json({ data });
  } catch (err) {
    console.error('[admin/system] GET /audit-log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/system/failed-requests ───────────────────────────────────
// Returns API proxy requests that failed (status = 'failed' or have an error_message).
router.get('/failed-requests', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('api_usage_logs')
      .select(`
        id,
        organization_id,
        provider,
        model,
        status,
        error_message,
        latency_ms,
        logged_at
      `)
      .or('status.eq.failed,error_message.not.is.null')
      .order('logged_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const orgIds = [...new Set((logs || []).map(l => l.organization_id).filter(Boolean))];

    const { data: orgs } = orgIds.length
      ? await supabase.from('organizations').select('id, name').in('id', orgIds)
      : { data: [] };

    const orgsMap = new Map((orgs || []).map(o => [o.id, o]));

    const data = (logs || []).map(log => ({
      ...log,
      organizations: log.organization_id ? (orgsMap.get(log.organization_id) || null) : null
    }));

    res.json({ data });
  } catch (err) {
    console.error('[admin/system] GET /failed-requests error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
