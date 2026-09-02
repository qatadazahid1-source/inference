import { useState, useCallback, useMemo } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Card } from '../../../components/ui/Card/Card';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { ApiError } from '../../../lib/axios';
import {
  useTwoFactorStatus,
  useSecuritySessions,
  useLoginHistory,
  useStart2FA,
  useVerify2FA,
  useDisable2FA,
  useRegenerateBackupCodes,
  useRevokeSession,
  useRevokeAllOtherSessions,
  type LoginHistoryEntry,
} from '../../../hooks/queries/useSecurity';
import styles from './Security.module.css';

const statusBadgeVariant: Record<LoginHistoryEntry['status'], 'success' | 'warning' | 'error'> = {
  success: 'success',
  blocked: 'warning',
  failed: 'error',
};

const statusLabel: Record<LoginHistoryEntry['status'], string> = {
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

function messageFrom(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function Security() {
  const { addToast } = useToast();

  // Server state via React Query
  const twoFactorQuery = useTwoFactorStatus();
  const sessionsQuery = useSecuritySessions();
  const loginHistoryQuery = useLoginHistory();

  // Mutations
  const start2FA = useStart2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();
  const regenerateBackupCodes = useRegenerateBackupCodes();
  const revokeSession = useRevokeSession();
  const revokeAllOthers = useRevokeAllOtherSessions();

  // Local UI state (setup flow + one-time secrets)
  const [isEnabling, setIsEnabling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const twoFAEnabled = twoFactorQuery.data?.isEnabled ?? false;
  const backupCodesRemaining = twoFactorQuery.data?.backupCodesRemaining ?? 0;
  const sessions = sessionsQuery.data ?? [];

  const loginHistory = useMemo(
    () => (loginHistoryQuery.data?.pages ?? []).flatMap((page) => page.entries),
    [loginHistoryQuery.data],
  );

  const isLoading =
    twoFactorQuery.isLoading || sessionsQuery.isLoading || loginHistoryQuery.isLoading;

  const is2FABusy =
    start2FA.isPending ||
    verify2FA.isPending ||
    disable2FA.isPending ||
    regenerateBackupCodes.isPending;

  const handleEnable2FA = useCallback(async () => {
    try {
      const data = await start2FA.mutateAsync();
      setQrCode(data.qrCodeDataUrl);
      setIsEnabling(true);
    } catch (err) {
      addToast(messageFrom(err, 'Failed to start 2FA setup'), 'error');
    }
  }, [start2FA, addToast]);

  const handleVerifyCode = useCallback(async () => {
    if (verificationCode.length !== 6) return;
    try {
      const data = await verify2FA.mutateAsync(verificationCode);
      setIsEnabling(false);
      setQrCode(null);
      setBackupCodes(data.backupCodes);
      setVerificationCode('');
      addToast('Two-factor authentication enabled', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Invalid code'), 'error');
    }
  }, [verificationCode, verify2FA, addToast]);

  const handleDisable2FA = useCallback(async () => {
    try {
      await disable2FA.mutateAsync();
      setBackupCodes([]);
      addToast('Two-factor authentication disabled', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to disable 2FA'), 'error');
    }
  }, [disable2FA, addToast]);

  const handleRegenerateBackup = useCallback(async () => {
    try {
      const codes = await regenerateBackupCodes.mutateAsync();
      setBackupCodes(codes);
      addToast('Backup codes regenerated', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to regenerate backup codes'), 'error');
    }
  }, [regenerateBackupCodes, addToast]);

  const handleRevokeSession = useCallback(async (id: string) => {
    try {
      await revokeSession.mutateAsync(id);
      addToast('Session revoked', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to revoke session'), 'error');
    }
  }, [revokeSession, addToast]);

  const handleRevokeAllOthers = useCallback(async () => {
    try {
      await revokeAllOthers.mutateAsync();
      addToast('All other sessions revoked', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to revoke sessions'), 'error');
    }
  }, [revokeAllOthers, addToast]);

  const handleLoadMore = useCallback(async () => {
    try {
      await loginHistoryQuery.fetchNextPage();
    } catch (err) {
      addToast(messageFrom(err, 'Failed to load more history'), 'error');
    }
  }, [loginHistoryQuery, addToast]);

  const hasMoreHistory = loginHistoryQuery.hasNextPage;

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
                isLoading={revokeAllOthers.isPending}
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
              <button
                type="button"
                className={styles.loadMore}
                disabled={loginHistoryQuery.isFetchingNextPage}
                onClick={handleLoadMore}
              >
                {loginHistoryQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
