import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import axiosClient from '../../../lib/axios';
import styles from './SubmissionQueue.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Submitter {
  email?: string;
  full_name?: string;
}

interface ProviderSub {
  id: string;
  name: string;
  provider_id: string;
  website_url?: string;
  docs_url?: string;
  base_url?: string;
  protocol?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_at?: string;
  submitted_by: string;
  created_at: string;
  submitter?: Submitter;
}

interface ModelSub {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  docs_url?: string;
  context_window?: number;
  pricing_components: Array<{
    component_type: string;
    unit: string;
    price_per_unit: number;
    normalized_per_1k: number;
    pricing_type?: 'custom_rate' | 'global_update';
    price_diff_detected?: boolean;
    catalog_per_1k?: number;
  }>;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_at?: string;
  submitted_by: string;
  created_at: string;
  submitter?: Submitter;
  pricing_type?: 'custom_rate' | 'global_update';
  price_diff_detected?: boolean;
  catalog_pricing?: {
    input_cost_per_1k?: number | null;
    output_cost_per_1k?: number | null;
  } | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    pending:  { icon: <Clock size={12} />,       cls: styles.badgePending,  label: 'Pending'  },
    approved: { icon: <CheckCircle size={12} />, cls: styles.badgeApproved, label: 'Approved' },
    rejected: { icon: <XCircle size={12} />,     cls: styles.badgeRejected, label: 'Rejected' },
  };
  const cfg = map[status] ?? map.pending;
  return <span className={`${styles.badge} ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>;
}

// ─── Rejection reason dialog (inline) ────────────────────────────────────────
function RejectDialog({ onConfirm, onCancel }: { onConfirm: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className={styles.rejectDialog}>
      <p className={styles.rejectLabel}>Rejection reason (required):</p>
      <textarea
        className={styles.rejectTextarea}
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        placeholder="Explain why this submission cannot be approved…"
        autoFocus
      />
      <div className={styles.rejectActions}>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
          disabled={!reason.trim()}
        >
          Confirm Rejection
        </Button>
      </div>
    </div>
  );
}

// ─── Provider Submission Row ──────────────────────────────────────────────────
function ProviderRow({
  sub,
  onApprove,
  onReject,
}: {
  sub: ProviderSub;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [working,   setWorking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const approve = async () => {
    setWorking(true); setError(null);
    try { await onApprove(sub.id); }
    catch (e: any) { setError(e?.response?.data?.error ?? 'Approve failed.'); }
    finally { setWorking(false); }
  };

  const reject = async (reason: string) => {
    setWorking(true); setError(null);
    try { await onReject(sub.id, reason); setRejecting(false); }
    catch (e: any) { setError(e?.response?.data?.error ?? 'Reject failed.'); }
    finally { setWorking(false); }
  };

  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHeader} onClick={() => setExpanded(x => !x)}>
        <div className={styles.subCardLeft}>
          <span className={styles.subName}>{sub.name}</span>
          <span className={styles.subId}>{sub.provider_id}</span>
          {sub.protocol && <span className={styles.subProto}>{sub.protocol}</span>}
        </div>
        <div className={styles.subCardRight}>
          <StatusBadge status={sub.status} />
          <span className={styles.subDate}>{new Date(sub.created_at).toLocaleDateString()}</span>
          <span className={styles.subUser}>{sub.submitter?.email ?? sub.submitted_by.slice(0, 8) + '…'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className={styles.subCardBody}>
          {sub.website_url && <a href={sub.website_url} target="_blank" rel="noreferrer" className={styles.link}>Website</a>}
          {sub.docs_url    && <a href={sub.docs_url}    target="_blank" rel="noreferrer" className={styles.link}>Docs</a>}
          {sub.base_url    && <div className={styles.meta}><strong>Base URL:</strong> <code>{sub.base_url}</code></div>}
          {sub.notes       && <div className={styles.meta}><strong>Notes:</strong> {sub.notes}</div>}
          {sub.rejection_reason && (
            <div className={styles.rejectionNote}>
              <XCircle size={13} /> Rejected: {sub.rejection_reason}
            </div>
          )}
          {error && <div className={styles.errorNote}><AlertCircle size={13} /> {error}</div>}
          {sub.status === 'pending' && !rejecting && (
            <div className={styles.actions}>
              <Button onClick={approve} disabled={working}>
                {working ? 'Working…' : '✓ Approve'}
              </Button>
              <Button variant="ghost" onClick={() => setRejecting(true)} disabled={working}>
                ✕ Reject
              </Button>
            </div>
          )}
          {sub.status === 'pending' && rejecting && (
            <RejectDialog onConfirm={reject} onCancel={() => setRejecting(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Model Submission Row ─────────────────────────────────────────────────────
function ModelRow({
  sub,
  onApprove,
  onReject,
}: {
  sub: ModelSub;
  onApprove: (id: string, updateGlobal?: boolean) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [working,   setWorking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const approve = async (updateGlobal = false) => {
    setWorking(true); setError(null);
    try { await onApprove(sub.id, updateGlobal); }
    catch (e: any) { setError(e?.data?.error ?? e?.response?.data?.error ?? e?.message ?? 'Approve failed.'); }
    finally { setWorking(false); }
  };

  const reject = async (reason: string) => {
    setWorking(true); setError(null);
    try { await onReject(sub.id, reason); setRejecting(false); }
    catch (e: any) { setError(e?.data?.error ?? e?.response?.data?.error ?? e?.message ?? 'Reject failed.'); }
    finally { setWorking(false); }
  };

  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHeader} onClick={() => setExpanded(x => !x)}>
        <div className={styles.subCardLeft}>
          <span className={styles.subName}>{sub.display_name}</span>
          <code className={styles.subId}>{sub.model_id}</code>
          <span className={styles.subProto}>{sub.provider}</span>

          {sub.pricing_type === 'custom_rate' ? (
            <span className={styles.badgeCustomRate} title="Organization-specific custom negotiated rate">
              🏢 Custom Rate
            </span>
          ) : (
            <span className={styles.badgeGlobalUpdate} title="Global provider rate update">
              🌐 Global Update
            </span>
          )}

          {sub.price_diff_detected && (
            <span className={styles.badgeDiff} title="Price discrepancy with catalog detected">
              ⚠️ Price Discrepancy
            </span>
          )}
        </div>
        <div className={styles.subCardRight}>
          <StatusBadge status={sub.status} />
          <span className={styles.subDate}>{new Date(sub.created_at).toLocaleDateString()}</span>
          <span className={styles.subUser}>{sub.submitter?.email ?? sub.submitted_by.slice(0, 8) + '…'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className={styles.subCardBody}>
          {sub.docs_url && <a href={sub.docs_url} target="_blank" rel="noreferrer" className={styles.link}>Docs</a>}
          {sub.context_window && <div className={styles.meta}><strong>Context window:</strong> {sub.context_window.toLocaleString()} tokens</div>}

          {/* Price discrepancy comparison banner */}
          {(sub.price_diff_detected || sub.catalog_pricing) && (
            <div className={styles.diffAlert}>
              <div className={styles.diffTitle}>
                <AlertCircle size={14} /> Price Discrepancy with Live Catalog
              </div>
              <div className={styles.diffGrid}>
                <div className={styles.diffCol}>
                  <span className={styles.diffLabel}>
                    Submitter Requested ({sub.pricing_type === 'custom_rate' ? 'Custom Org Rate' : 'Global Update'}):
                  </span>
                  <div>Input: <strong>${((sub.input_cost_per_1k ?? 0) * 1000).toFixed(4)} / 1M</strong> <span className={styles.per1k}>(${Number(sub.input_cost_per_1k ?? 0).toFixed(6)} / 1K)</span></div>
                  <div>Output: <strong>${((sub.output_cost_per_1k ?? 0) * 1000).toFixed(4)} / 1M</strong> <span className={styles.per1k}>(${Number(sub.output_cost_per_1k ?? 0).toFixed(6)} / 1K)</span></div>
                </div>
                {sub.catalog_pricing && (
                  <div className={styles.diffCol}>
                    <span className={styles.diffLabel}>Current Live Catalog Rate:</span>
                    <div>Input: <strong>${((Number(sub.catalog_pricing.input_cost_per_1k) || 0) * 1000).toFixed(4)} / 1M</strong> <span className={styles.per1k}>(${Number(sub.catalog_pricing.input_cost_per_1k ?? 0).toFixed(6)} / 1K)</span></div>
                    <div>Output: <strong>${((Number(sub.catalog_pricing.output_cost_per_1k) || 0) * 1000).toFixed(4)} / 1M</strong> <span className={styles.per1k}>(${Number(sub.catalog_pricing.output_cost_per_1k ?? 0).toFixed(6)} / 1K)</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing components table */}
          {sub.pricing_components?.length > 0 && (
            <div className={styles.compTable}>
              <div className={styles.compHead}>
                <span>Component</span><span>Per unit</span><span>Unit</span><span>/ 1K tokens</span>
              </div>
              {sub.pricing_components.map((c, i) => (
                <div key={i} className={styles.compRow}>
                  <span>{c.component_type.replace(/_/g, ' ')}</span>
                  <span style={{ fontFamily: 'monospace' }}>${c.price_per_unit}</span>
                  <span>{c.unit}</span>
                  <span style={{ fontFamily: 'monospace', color: '#4ade80' }}>${c.normalized_per_1k?.toFixed(8)}</span>
                </div>
              ))}
            </div>
          )}

          {sub.notes && <div className={styles.meta}><strong>Notes:</strong> {sub.notes}</div>}

          {sub.rejection_reason && (
            <div className={styles.rejectionNote}>
              <XCircle size={13} /> Rejected: {sub.rejection_reason}
            </div>
          )}
          {error && <div className={styles.errorNote}><AlertCircle size={13} /> {error}</div>}

          {sub.status === 'pending' && !rejecting && (
            <div className={styles.actions}>
              {sub.pricing_type === 'global_update' ? (
                <>
                  <Button onClick={() => approve(true)} disabled={working}>
                    {working ? 'Working…' : '🌐 Update Global Catalog & Approve'}
                  </Button>
                  <Button variant="secondary" onClick={() => approve(false)} disabled={working}>
                    ✓ Approve for Org Only
                  </Button>
                </>
              ) : (
                <Button onClick={() => approve(false)} disabled={working}>
                  {working ? 'Working…' : '✓ Approve as Custom Rate for Org'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setRejecting(true)} disabled={working}>✕ Reject</Button>
            </div>
          )}
          {sub.status === 'pending' && rejecting && (
            <RejectDialog onConfirm={reject} onCancel={() => setRejecting(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SubmissionQueuePage() {
  const [providers, setProviders]       = useState<ProviderSub[]>([]);
  const [models,    setModels]          = useState<ModelSub[]>([]);
  const [loading,   setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [tab, setTab]                   = useState<'models' | 'providers'>('models');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get<{
        data: { providers: ProviderSub[]; models: ModelSub[] }
      }>(`/api/admin/submissions?status=${statusFilter}`);
      setProviders(data.data.providers || []);
      setModels(data.data.models       || []);
    } catch (err) {
      console.error('[SubmissionQueue] load error', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const approveProvider = async (id: string) => {
    await axiosClient.post(`/api/admin/submissions/providers/${id}/approve`);
    await load();
  };

  const rejectProvider = async (id: string, reason: string) => {
    await axiosClient.post(`/api/admin/submissions/providers/${id}/reject`, { reason });
    await load();
  };

  const approveModel = async (id: string, updateGlobal = false) => {
    await axiosClient.post(`/api/admin/submissions/models/${id}/approve`, { update_global: updateGlobal });
    await load();
  };

  const rejectModel = async (id: string, reason: string) => {
    await axiosClient.post(`/api/admin/submissions/models/${id}/reject`, { reason });
    await load();
  };

  const pendingCount = {
    providers: providers.filter(p => p.status === 'pending').length,
    models:    models.filter(m => m.status === 'pending').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Submission Queue</h1>
          <p className={styles.pageSubtitle}>Review user-submitted providers and models before they enter the catalog.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${statusFilter === 'pending' ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending only
            </button>
            <button
              className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
          </div>
          <Button onClick={() => void load()} variant="ghost">Refresh</Button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'models' ? styles.activeTab : ''}`}
          onClick={() => setTab('models')}
        >
          Models
          {pendingCount.models > 0 && <span className={styles.pendingBubble}>{pendingCount.models}</span>}
        </button>
        <button
          className={`${styles.tab} ${tab === 'providers' ? styles.activeTab : ''}`}
          onClick={() => setTab('providers')}
        >
          Providers
          {pendingCount.providers > 0 && <span className={styles.pendingBubble}>{pendingCount.providers}</span>}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.list}>
          {tab === 'models' && (
            models.length === 0
              ? <div className={styles.empty}>No model submissions match this filter.</div>
              : models.map(m => (
                  <ModelRow key={m.id} sub={m} onApprove={approveModel} onReject={rejectModel} />
                ))
          )}
          {tab === 'providers' && (
            providers.length === 0
              ? <div className={styles.empty}>No provider submissions match this filter.</div>
              : providers.map(p => (
                  <ProviderRow key={p.id} sub={p} onApprove={approveProvider} onReject={rejectProvider} />
                ))
          )}
        </div>
      )}
    </div>
  );
}
