import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import axiosClient from '../../../lib/axios';
import styles from './MySubmissions.module.css';

interface ProviderSub {
  id: string;
  name: string;
  provider_id: string;
  protocol: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface ModelSub {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

const STATUS_CONFIG = {
  pending:  { icon: <Clock size={13} />,        label: 'Pending Review', cls: 'pending'  },
  approved: { icon: <CheckCircle size={13} />,  label: 'Approved',       cls: 'approved' },
  rejected: { icon: <XCircle size={13} />,      label: 'Rejected',       cls: 'rejected' },
};

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`${styles.badge} ${styles[cfg.cls]}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function MySubmissions() {
  const [providers, setProviders] = useState<ProviderSub[]>([]);
  const [models,    setModels]    = useState<ModelSub[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<'models' | 'providers'>('models');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        axiosClient.get<{ data: ProviderSub[] }>('/api/submissions/providers'),
        axiosClient.get<{ data: ModelSub[] }>('/api/submissions/models'),
      ]);
      setProviders(pRes.data.data || []);
      setModels(mRes.data.data    || []);
    } catch (err) {
      console.error('MySubmissions: load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = providers.length + models.length;
  if (!loading && total === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>My Submissions</h3>
        <div className={styles.headerRight}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'models' ? styles.activeTab : ''}`}
              onClick={() => setTab('models')}
            >
              Models {models.length > 0 && <span className={styles.count}>{models.length}</span>}
            </button>
            <button
              className={`${styles.tab} ${tab === 'providers' ? styles.activeTab : ''}`}
              onClick={() => setTab('providers')}
            >
              Providers {providers.length > 0 && <span className={styles.count}>{providers.length}</span>}
            </button>
          </div>
          <button className={styles.refreshBtn} onClick={() => void load()} title="Refresh">
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>Loading…</div>
      ) : (
        <>
          {tab === 'models' && (
            models.length === 0 ? (
              <p className={styles.empty}>No model submissions yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Provider</th>
                    <th>Input / 1M</th>
                    <th>Output / 1M</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {m.model_id}
                        {m.display_name !== m.model_id && (
                          <span className={styles.displayName}> · {m.display_name}</span>
                        )}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{m.provider}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {m.input_cost_per_1k != null ? `$${(m.input_cost_per_1k * 1000).toFixed(3)}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {m.output_cost_per_1k != null ? `$${(m.output_cost_per_1k * 1000).toFixed(3)}` : '—'}
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                        {m.status === 'rejected' && m.rejection_reason && (
                          <div className={styles.rejectReason}>{m.rejection_reason}</div>
                        )}
                      </td>
                      <td className={styles.date}>
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'providers' && (
            providers.length === 0 ? (
              <p className={styles.empty}>No provider submissions yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Provider ID</th>
                    <th>Protocol</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.provider_id}</td>
                      <td>{p.protocol ?? '—'}</td>
                      <td>
                        <StatusBadge status={p.status} />
                        {p.status === 'rejected' && p.rejection_reason && (
                          <div className={styles.rejectReason}>{p.rejection_reason}</div>
                        )}
                      </td>
                      <td className={styles.date}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </>
      )}
    </div>
  );
}
