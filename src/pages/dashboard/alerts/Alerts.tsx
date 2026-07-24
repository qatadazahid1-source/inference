import { useState, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, Check, X, Plus, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import { DashboardService, AlertData, AlertRuleData } from '../../../api/services/dashboard.service';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import type { Alert } from '../../../types/dashboard.types';
import styles from './Alerts.module.css';

type FilterKey = 'all' | 'budget' | 'anomaly' | 'security' | 'billing' | 'system';

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'budget', label: 'Budget' },
  { key: 'anomaly', label: 'Anomaly' },
  { key: 'security', label: 'Security' },
  { key: 'billing', label: 'Billing' },
  { key: 'system', label: 'System' },
];

const filterTypeMap: Record<FilterKey, Alert['type'] | null> = {
  all: null,
  budget: 'budget_threshold',
  anomaly: 'cost_anomaly',
  security: 'security',
  billing: 'billing',
  system: 'system_error',
};

const conditionLabels: Record<string, string> = {
  budget_percent: 'Budget %',
  cost_spike: 'Cost Spike',
  daily_cost: 'Daily Cost',
  model_latency: 'Model Latency',
  error_rate: 'Error Rate',
  token_usage: 'Token Usage',
};

const channelLabels: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email (soon)',
  slack: 'Slack (soon)',
  sms: 'SMS (soon)',
};

// Only In-App delivery is actually wired up right now — no email/Slack/SMS
// service is configured anywhere in the system. Rather than build a
// fake-functional UI for channels that don't deliver anything, these stay
// visibly disabled until a real provider is integrated.
const availableChannels = new Set(['in_app']);

const severityIcon: Record<Alert['severity'], typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const severityClass: Record<Alert['severity'], string> = {
  critical: styles.severityCritical,
  warning: styles.severityWarning,
  info: styles.severityInfo,
};

interface NewRule {
  name: string;
  condition: string;
  threshold: string;
  scope: string;
  channels: string[];
}

const defaultNewRule: NewRule = {
  name: '',
  condition: 'budget_percent',
  threshold: '',
  scope: '',
  channels: ['in_app'],
};

const allChannels = ['in_app', 'email', 'slack', 'sms'];

export function Alerts() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState<NewRule>(defaultNewRule);
  const [rules, setRules] = useState<AlertRuleData[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [isSavingRule, setIsSavingRule] = useState(false);
  // null = "Create Alert Rule" modal; a rule id = editing that existing rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  // id of the rule pending delete confirmation, or null if no confirm dialog is open
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [alerts, setAlerts] = useState<(AlertData & { isRead?: boolean })[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!user?.id) return;
    try {
      const fetchedAlerts = await DashboardService.getAlerts(user.id);
      
      setAlerts((prev) => {
        // Only include fetched alerts that haven't been dismissed
        const activeAlerts = fetchedAlerts.filter(fa => !dismissedIds.has(fa.id));
        return activeAlerts.map(fa => {
          const existing = prev.find(p => p.id === fa.id);
          return { ...fa, isRead: existing ? existing.isRead : fa.isRead };
        });
      });
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const fetchedRules = await DashboardService.getAlertRules();
      setRules(fetchedRules);
    } catch (err) {
      console.error('Failed to fetch alert rules', err);
    } finally {
      setRulesLoading(false);
    }
  };

  // One-time on page load: evaluate all active rules against real current
  // data (no background scheduler exists — this is the on-demand check),
  // then refresh both alerts and rules so any newly triggered alert shows
  // up immediately and last_triggered_at is reflected.
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    DashboardService.checkAlertRules()
      .catch((err) => console.error('Failed to check alert rules', err))
      .finally(() => {
        if (!isMounted) return;
        fetchAlerts();
        fetchRules();
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Supabase Realtime subscription — replaces the 5-second polling above.
  // When a new alert is inserted or updated in the alerts table (e.g. by
  // POST /api/alert-rules/check on the backend), this fires fetchAlerts
  // immediately so the UI updates without waiting for the next poll tick.
  // RLS (confirmed active on the alerts table) ensures the subscription
  // only delivers rows for the authenticated user's own organization —
  // no cross-org data leaks through the real-time channel.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          // A change happened — re-fetch the full list rather than trying
          // to patch state from the payload, so the UI stays consistent
          // with what the server actually has (including read-status, etc.)
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    const alertType = filterTypeMap[activeFilter];
    if (!alertType) return alerts;
    return alerts.filter((a) => a.type === alertType);
  }, [activeFilter, alerts]);

  const handleMarkRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    );

    DashboardService.markAlertRead(id).catch((err) => {
      console.error('Failed to mark alert as read', err);
      // Revert on failure
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: false } : a)),
      );
    });
  };

  const handleDismiss = (id: string) => {
    const removedAlert = alerts.find((a) => a.id === id);

    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    DashboardService.dismissAlert(id).catch((err) => {
      console.error('Failed to dismiss alert', err);
      // Revert: un-dismiss and restore the alert in the list
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (removedAlert) {
        setAlerts((prev) => [...prev, removedAlert]);
      }
    });
  };

  const handleToggleRule = (id: string) => {
    const targetRule = rules.find((r) => r.id === id);
    if (!targetRule) return;
    const nextEnabled = !targetRule.enabled;

    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r)),
    );

    DashboardService.toggleAlertRule(id, nextEnabled).catch((err) => {
      console.error('Failed to toggle alert rule', err);
      // Revert on failure
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !nextEnabled } : r)),
      );
    });
  };

  // Saves the modal: creates a new rule when editingRuleId is null,
  // otherwise updates the existing rule (same modal, two modes).
  const handleSaveRule = async () => {
    if (!newRule.name.trim() || !newRule.threshold.trim()) {
      // Required fields missing — keep the modal open rather than silently
      // closing on bad input.
      return;
    }

    // Only 'in_app' is actually wired up end-to-end right now — see the
    // disabled email/slack/sms checkboxes below. Filtering here means the
    // rule we save always reflects what we can really deliver.
    const payload = {
      name: newRule.name,
      condition: newRule.condition,
      threshold: Number(newRule.threshold),
      scope: newRule.scope,
      channels: newRule.channels.filter((ch) => ch === 'in_app'),
    };

    setIsSavingRule(true);
    try {
      if (editingRuleId) {
        const updated = await DashboardService.updateAlertRule(editingRuleId, payload);
        setRules((prev) => prev.map((r) => (r.id === editingRuleId ? updated : r)));
      } else {
        const created = await DashboardService.createAlertRule({ ...payload, enabled: true });
        setRules((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
      setEditingRuleId(null);
      setNewRule(defaultNewRule);
    } catch (err) {
      console.error('Failed to save alert rule', err);
    } finally {
      setIsSavingRule(false);
    }
  };

  // Opens the modal pre-filled with an existing rule's data (Edit button).
  const handleOpenEdit = (rule: AlertRuleData) => {
    setEditingRuleId(rule.id);
    setNewRule({
      name: rule.name,
      condition: rule.condition,
      threshold: String(rule.threshold),
      scope: rule.scope || '',
      channels: rule.channels.length > 0 ? rule.channels : ['in_app'],
    });
    setCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    setNewRule(defaultNewRule);
    setCreateOpen(true);
  };

  // Deletes a rule after the confirm dialog. Removes it from the list
  // optimistically; restores it if the backend call fails.
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    const removedRule = rules.find((r) => r.id === id);
    const removedIndex = rules.findIndex((r) => r.id === id);

    setIsDeletingRule(true);
    try {
      await DashboardService.deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete alert rule', err);
      // Keep the confirm dialog open so the user can see something went
      // wrong and retry, rather than silently failing.
      if (removedRule && removedIndex !== -1) {
        setRules((prev) => {
          if (prev.some((r) => r.id === id)) return prev;
          const next = [...prev];
          next.splice(removedIndex, 0, removedRule);
          return next;
        });
      }
    } finally {
      setIsDeletingRule(false);
    }
  };

  const toggleChannel = (ch: string) => {
    setNewRule((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>Alerts</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} />
          Create Alert Rule
        </Button>
      </div>

      <div className={styles.filterBar}>
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.filterTab} ${activeFilter === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.feed}>
        {isLoading && filteredAlerts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            Loading alerts...
          </div>
        )}
        {filteredAlerts.map((alert) => {
          const severity = alert.severity as Alert['severity'];
          const SevIcon = severityIcon[severity];
          return (
            <div
              key={alert.id}
              className={`${styles.alertItem} ${!alert.isRead ? styles.alertUnread : ''}`}
            >
              <div className={`${styles.severityIcon} ${severityClass[severity]}`}>
                <SevIcon size={18} />
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>{alert.title}</div>
                <div className={styles.alertMessage}>{alert.message}</div>
                <div className={styles.alertTime}>{new Date(alert.time).toLocaleString()}</div>
              </div>
              <div className={styles.alertActions}>
                {!alert.isRead && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleMarkRead(alert.id)}
                    aria-label="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDismiss(alert.id)}
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {!isLoading && filteredAlerts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No alerts to show
          </div>
        )}
      </div>

      <div className={styles.rulesSection}>
        <h2 className={styles.sectionTitle}>Alert Rules</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Condition</th>
                <th>Threshold</th>
                <th>Scope</th>
                <th>Channels</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rulesLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-tertiary)' }}>
                    Loading alert rules...
                  </td>
                </tr>
              ) : rules.length > 0 ? (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text-primary)' }}>
                      {rule.name}
                    </td>
                    <td>{conditionLabels[rule.condition] ?? rule.condition}</td>
                    <td>
                      {rule.condition === 'model_latency'
                        ? `${rule.threshold}ms`
                        : rule.condition === 'error_rate'
                        ? `${rule.threshold} failures/hr`
                        : rule.condition === 'token_usage'
                        ? `${Number(rule.threshold).toLocaleString()} tokens/day`
                        : rule.condition === 'cost_spike'
                        ? `${rule.threshold}x`
                        : `${rule.threshold}%`}
                    </td>
                    <td>{rule.scope}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {rule.channels.map((ch: string) => (
                          <Badge key={ch} variant="neutral">{channelLabels[ch] ?? ch}</Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`${styles.toggleBtn} ${rule.enabled ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => handleToggleRule(rule.id)}
                        aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      >
                        <span
                          className={styles.toggleKnob}
                          style={{ left: rule.enabled ? 20 : 2 }}
                        />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(rule)}>
                          Edit
                        </Button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => setDeleteTargetId(rule.id)}
                          aria-label={`Delete rule ${rule.name}`}
                          title="Delete rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                    No alert rules defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingRuleId(null);
        }}
        title={editingRuleId ? 'Edit Alert Rule' : 'Create Alert Rule'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <Input
            label="Rule Name"
            value={newRule.name}
            onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Monthly Budget 80%"
          />

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Condition</label>
            <select
              className={styles.select}
              value={newRule.condition}
              onChange={(e) => setNewRule((prev) => ({ ...prev, condition: e.target.value }))}
            >
              <option value="budget_percent">Budget %</option>
              <option value="cost_spike">Cost Spike</option>
              <option value="daily_cost">Daily Cost</option>
              <option value="model_latency">Model Latency</option>
              <option value="error_rate">Error Rate</option>
              <option value="token_usage">Token Usage</option>
            </select>
          </div>

          <Input
            label={
              newRule.condition === 'error_rate'
                ? 'Threshold (failures per hour)'
                : newRule.condition === 'token_usage'
                ? 'Threshold (tokens per day)'
                : newRule.condition === 'cost_spike'
                ? 'Threshold (multiplier vs yesterday)'
                : 'Threshold'
            }
            type="number"
            value={newRule.threshold}
            onChange={(e) => setNewRule((prev) => ({ ...prev, threshold: e.target.value }))}
            placeholder={
              newRule.condition === 'error_rate'
                ? 'e.g. 5'
                : newRule.condition === 'token_usage'
                ? 'e.g. 100000'
                : newRule.condition === 'cost_spike'
                ? 'e.g. 2 (= 2x yesterday)'
                : 'e.g. 80'
            }
          />

          <Input
            label="Scope"
            value={newRule.scope}
            onChange={(e) => setNewRule((prev) => ({ ...prev, scope: e.target.value }))}
            placeholder="e.g. OpenAI, All Providers"
          />

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Channels</label>
            <div className={styles.channelGroup}>
              {allChannels.map((ch) => {
                const isAvailable = availableChannels.has(ch);
                return (
                  <label
                    key={ch}
                    className={styles.channelLabel}
                    style={!isAvailable ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    title={!isAvailable ? 'Coming soon' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={newRule.channels.includes(ch)}
                      disabled={!isAvailable}
                      onChange={() => toggleChannel(ch)}
                    />
                    {channelLabels[ch]}
                  </label>
                );
              })}
            </div>
          </div>

          <Button fullWidth onClick={handleSaveRule} isLoading={isSavingRule} loadingText="Saving…">
            {editingRuleId ? 'Save Changes' : 'Save Rule'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Alert Rule"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Are you sure you want to delete{' '}
            <strong>{rules.find((r) => r.id === deleteTargetId)?.name ?? 'this rule'}</strong>?
            This can't be undone.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDeleteTargetId(null)} disabled={isDeletingRule}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeletingRule} loadingText="Deleting…">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
