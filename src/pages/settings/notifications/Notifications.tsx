import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../services/notifications';
import type { NotificationPreferences } from '../../../types/database.types';
import styles from './Notifications.module.css';

type Channel = 'inapp' | 'email' | 'slack' | 'sms';

const channels: { key: Channel; label: string }[] = [
  { key: 'inapp', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'slack', label: 'Slack' },
  { key: 'sms', label: 'SMS' },
];

// Maps each row to the real notification_preferences columns that back it.
// Not every category has all four channels as real columns — where a
// channel has no backing column, we leave that cell blank rather than
// showing a toggle that silently does nothing.
interface Row {
  id: string;
  label: string;
  columns: Partial<Record<Channel, keyof NotificationPreferences>>;
}

interface Group {
  id: string;
  groupLabel: string;
  rows: Row[];
}

const groups: Group[] = [
  {
    id: 'budget_alerts',
    groupLabel: 'Budget & Cost Alerts',
    rows: [
      {
        id: 'budget',
        label: 'Budget Threshold Reached',
        columns: { inapp: 'budget_alerts_inapp', email: 'budget_alerts_email', slack: 'budget_alerts_slack', sms: 'budget_alerts_sms' },
      },
      {
        id: 'cost_anomaly',
        label: 'Sudden Cost Spike',
        columns: { inapp: 'cost_anomaly_inapp', email: 'cost_anomaly_email', slack: 'cost_anomaly_slack', sms: 'cost_anomaly_sms' },
      },
    ],
  },
  {
    id: 'reports',
    groupLabel: 'Reports & Digests',
    rows: [
      { id: 'weekly_digest', label: 'Weekly Digest', columns: { email: 'weekly_digest_email' } },
      { id: 'monthly_report', label: 'Monthly Report', columns: { email: 'monthly_report_email' } },
    ],
  },
  {
    id: 'system_alerts',
    groupLabel: 'System & Security',
    rows: [
      { id: 'team_alerts', label: 'Team Activity', columns: { inapp: 'team_alerts_inapp' } },
      { id: 'security_alerts', label: 'Security Advisories', columns: { email: 'security_alerts_email', sms: 'security_alerts_sms' } },
      { id: 'billing_alerts', label: 'Billing Alerts', columns: { email: 'billing_alerts_email' } },
    ],
  },
];

export function Notifications() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [initialPrefs, setInitialPrefs] = useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = prefs && initialPrefs && JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await getNotificationPreferences(user.id);
      if (error) throw new Error(error);
      if (data) {
        setPrefs(data);
        setInitialPrefs(data);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load notification preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = (column: keyof NotificationPreferences) => {
    setPrefs((prev) => (prev ? { ...prev, [column]: !prev[column] } : prev));
  };

  const handleSave = useCallback(async () => {
    if (!user || !prefs) return;
    setIsSaving(true);
    try {
      const { data, error } = await updateNotificationPreferences(user.id, prefs);
      if (error) throw new Error(error);
      if (data) {
        setPrefs(data);
        setInitialPrefs(data);
      }
      addToast('Notification preferences saved', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [user, prefs, addToast]);

  if (isLoading || !prefs) {
    return (
      <div className={styles.page}>
        <Skeleton height="28px" width="260px" />
        <div style={{ marginTop: 24 }}><Skeleton height="200px" /></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Notification Preferences</h1>
      <p className={styles.subtext}>
        Choose which notifications you receive across your channels.
      </p>

      {groups.map((group) => (
        <div key={group.id} className={styles.card}>
          <h2 className={styles.groupTitle}>{group.groupLabel}</h2>

          <div className={styles.headerRow}>
            <span>Notification</span>
            {channels.map((ch) => (
              <span key={ch.key} className={styles.toggleCenter}>
                {ch.label}
              </span>
            ))}
          </div>

          {group.rows.map((row) => (
            <div key={row.id} className={styles.notifRow}>
              <span className={styles.notifLabel}>{row.label}</span>
              {channels.map((ch) => {
                const column = row.columns[ch.key];
                if (!column) {
                  return <div key={ch.key} className={styles.toggleCenter} />;
                }
                const isOn = Boolean(prefs[column]);
                return (
                  <div key={ch.key} className={styles.toggleCenter}>
                    <button
                      className={`${styles.toggle} ${isOn ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleToggle(column)}
                      aria-label={`${row.label} ${ch.label}`}
                      type="button"
                    >
                      <span className={styles.toggleKnob} style={{ left: isOn ? 18 : 2 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      <div className={styles.saveBar}>
        <Button isLoading={isSaving} disabled={!isDirty} onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
