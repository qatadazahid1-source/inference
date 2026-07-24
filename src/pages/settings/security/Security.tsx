import { useState, useCallback, useEffect } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Card } from '../../../components/ui/Card/Card';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { supabase } from '../../../lib/supabase';
import styles from './Security.module.css';

interface Session {
  id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  ip_address: string | null;
  last_active_at: string;
  is_current: boolean;
}

interface LoginEntry {
  id: string;
  created_at: string;
  device: string | null;
  location: string | null;
  ip_address: string | null;
  status: 'success' | 'failed' | 'blocked';
}

const PAGE_SIZE = 5;

const statusBadgeVariant: Record<LoginEntry['status'], 'success' | 'warning' | 'error'> = {
  success: 'success',
  blocked: 'warning',
  failed: 'error',
};

const statusLabel: Record<LoginEntry['status'], string> = {
  success: 'Success',
  blocked: 'Suspicious',
  failed: 'Failed',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export function Security() {
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [is2FABusy, setIs2FABusy] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [twofa, sessionsRes, historyRes] = await Promise.all([
        authedFetch('/api/security/2fa'),
        authedFetch('/api/security/sessions'),
        authedFetch(`/api/security/login-history?limit=${PAGE_SIZE}&offset=0`),
      ]);
      setTwoFAEnabled(twofa.data.isEnabled);
      setBackupCodesRemaining(twofa.data.backupCodesRemaining ?? 0);
      setSessions(sessionsRes.data ?? []);
      setLoginHistory(historyRes.data ?? []);
      setHistoryTotal(historyRes.total ?? 0);
      setHistoryOffset(PAGE_SIZE);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load security settings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleEnable2FA = useCallback(async () => {
    setIs2FABusy(true);
    try {
      const { data } = await authedFetch('/api/security/2fa/start', { method: 'POST' });
      setQrCode(data.qrCodeDataUrl);
      setIsEnabling(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start 2FA setup', 'error');
    } finally {
      setIs2FABusy(false);
    }
  }, [addToast]);

  const handleVerifyCode = useCallback(async () => {
    if (verificationCode.length !== 6) return;
    setIs2FABusy(true);
    try {
      const { data } = await authedFetch('/api/security/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      setTwoFAEnabled(true);
      setIsEnabling(false);
      setQrCode(null);
      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(data.backupCodes.length);
      setVerificationCode('');
      addToast('Two-factor authentication enabled', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Invalid code', 'error');
    } finally {
      setIs2FABusy(false);
    }
  }, [verificationCode, addToast]);

  const handleDisable2FA = useCallback(async () => {
    setIs2FABusy(true);
    try {
      await authedFetch('/api/security/2fa/disable', { method: 'POST' });
      setTwoFAEnabled(false);
      setBackupCodes([]);
      setBackupCodesRemaining(0);
      addToast('Two-factor authentication disabled', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to disable 2FA', 'error');
    } finally {
      setIs2FABusy(false);
    }
  }, [addToast]);

  const handleRegenerateBackup = useCallback(async () => {
    setIs2FABusy(true);
    try {
      const { data } = await authedFetch('/api/security/2fa/backup-codes/regenerate', { method: 'POST' });
      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(data.backupCodes.length);
      addToast('Backup codes regenerated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to regenerate backup codes', 'error');
    } finally {
      setIs2FABusy(false);
    }
  }, [addToast]);

  const handleRevokeSession = useCallback(async (id: string) => {
    try {
      await authedFetch(`/api/security/sessions/${id}/revoke`, { method: 'POST' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      addToast('Session revoked', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revoke session', 'error');
    }
  }, [addToast]);

  const handleRevokeAllOthers = useCallback(async () => {
    try {
      await authedFetch('/api/security/sessions/revoke-all', { method: 'POST' });
      setSessions((prev) => prev.filter((s) => s.is_current));
      addToast('All other sessions revoked', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revoke sessions', 'error');
    }
  }, [addToast]);

  const handleLoadMore = useCallback(async () => {
    try {
      const { data, total } = await authedFetch(`/api/security/login-history?limit=${PAGE_SIZE}&offset=${historyOffset}`);
      setLoginHistory((prev) => [...prev, ...data]);
      setHistoryTotal(total);
      setHistoryOffset((prev) => prev + PAGE_SIZE);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load more history', 'error');
    }
  }, [historyOffset, addToast]);

  const hasMoreHistory = historyOffset < historyTotal;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div style={{ marginBottom: 32 }}>
          <Skeleton height="32px" width="220px" />
        </div>
        <Card><Skeleton height="140px" /></Card>
        <Card><Skeleton height="140px" /></Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 style={{ fontSize: 24, fontWeight: 'var(--fw-extrabold)' as string, marginBottom: 32 }}>
        Security Settings
      </h1>

      <Card>
        <h2 className={styles.sectionTitle}>Two-Factor Authentication</h2>

        {!twoFAEnabled && !isEnabling && (
          <>
            <div className={styles.twoFactorRow}>
              <Badge variant="neutral">Not Enabled</Badge>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Add an extra layer of security to your account by enabling
              two-factor authentication. You will be prompted for a verification
              code each time you sign in from an unrecognized device.
            </p>
            <Button variant="primary" isLoading={is2FABusy} onClick={handleEnable2FA}>
              Enable 2FA
            </Button>
          </>
        )}

        {isEnabling && (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Scan this QR code with your authenticator app (Google Authenticator, 1Password, Authy),
              then enter the 6-digit code it generates.
            </p>
            {qrCode && (
              <div style={{ marginBottom: 16 }}>
                <img src={qrCode} alt="2FA QR code" width={180} height={180} style={{ borderRadius: 8 }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                className={styles.codeInput}
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(val);
                }}
              />
              <Button
                variant="primary"
                isLoading={is2FABusy}
                disabled={verificationCode.length < 6}
                onClick={handleVerifyCode}
              >
                Verify
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEnabling(false);
                  setQrCode(null);
                  setVerificationCode('');
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {twoFAEnabled && !isEnabling && (
          <>
            <div className={styles.twoFactorRow}>
              <Badge variant="success">Enabled</Badge>
            </div>

            <div className={styles.backupActions}>
              <Button variant="danger" isLoading={is2FABusy} onClick={handleDisable2FA}>
                Disable 2FA
              </Button>
              <Button variant="secondary" isLoading={is2FABusy} onClick={handleRegenerateBackup}>
                Regenerate backup codes
              </Button>
            </div>

            {backupCodes.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  Save these backup codes in a secure place. Each one shown only once —
                  you can use them to access your account if you lose your authenticator device.
                </p>
                <div className={styles.backupGrid}>
                  {backupCodes.map((code, i) => (
                    <div key={i} className={styles.backupCode}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 12 }}>
                {backupCodesRemaining} backup codes remaining.
              </p>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Active Sessions</h2>

        {sessions.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            No active sessions.
          </p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Browser + OS</th>
                    <th>Location</th>
                    <th>IP Address</th>
                    <th>Last Active</th>
                    <th>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {session.device_name || 'Unknown device'}
                          {session.is_current && (
                            <span className={styles.currentDevice}>This device</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {session.browser || '—'} / {session.os || '—'}
                      </td>
                      <td>{session.location || '—'}</td>
                      <td>{session.ip_address || '—'}</td>
                      <td>{timeAgo(session.last_active_at)}</td>
                      <td>
                        {!session.is_current && (
                          <button
                            type="button"
                            className={styles.revokeBtn}
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16 }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={sessions.filter((s) => !s.is_current).length === 0}
                onClick={handleRevokeAllOthers}
              >
                Revoke All Other Sessions
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Login History</h2>

        {loginHistory.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            No login history available.
          </p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Device</th>
                    <th>Location</th>
                    <th>IP</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.device || '—'}</td>
                      <td>{entry.location || '—'}</td>
                      <td>{entry.ip_address || '—'}</td>
                      <td>
                        <Badge variant={statusBadgeVariant[entry.status]}>
                          {statusLabel[entry.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreHistory && (
              <button type="button" className={styles.loadMore} onClick={handleLoadMore}>
                Load more
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
