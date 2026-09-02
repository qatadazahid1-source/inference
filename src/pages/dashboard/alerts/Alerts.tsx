import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, Check, X, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import type { AlertRuleData } from '../../../api/services/dashboard.service';
import {
  useAlerts,
  useAlertRules,
  useMarkAlertRead,
  useDismissAlert,
  useToggleAlertRule,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useCheckAlertRules,
} from '../../../hooks/queries/useAlerts';
import { queryKeys } from '../../../hooks/queries/queryKeys';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import type { Alert } from '../../../types/dashboard.types';
import styles from './Alerts.module.css';
import { useEntitlements } from '../../../context/EntitlementsContext';

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
  const { limits, isAtLimit } = useEntitlements();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState<NewRule>(defaultNewRule);
  // null = "Create Alert Rule" modal; a rule id = editing that existing rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  // id of the rule pending delete confirmation, or null if no confirm dialog is open
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Gate the queries on auth being ready — mirrors the previous
  // `if (!user?.id) return;` guards inside the old fetch functions.
  const authReady = !!user?.id;

  // Server state now lives in React Query. `isPending` stays true until the
  // first successful fetch, matching the old `isLoading`/`rulesLoading`
  // (initialized true, set false in the fetch `finally`).
  const alertsQuery = useAlerts(authReady);
  const rulesQuery = useAlertRules(authReady);

  const alerts = alertsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const isLoading = alertsQuery.isPending;
  const rulesLoading = rulesQuery.isPending;

  // Mutations — optimistic cache updates, revert-on-failure and invalidation
  // all live inside the hooks (src/hooks/queries/useAlerts.ts).
  const markAlertReadMutation = useMarkAlertRead();
  const dismissAlertMutation = useDismissAlert();
  const toggleRuleMutation = useToggleAlertRule();
  const createRuleMutation = useCreateAlertRule();
  const updateRuleMutation = useUpdateAlertRule();
  const deleteRuleMutation = useDeleteAlertRule();
  const checkAlertRulesMutation = useCheckAlertRules();

  const isSavingRule = createRuleMutation.isPending || updateRuleMutation.isPending;
  const isDeletingRule = deleteRuleMutation.isPending;

  // One-time on page load: evaluate all active rules against real current
  // data (no background scheduler exists — this is the on-demand check). The
  // mutation's onSettled invalidates both the alerts and alert-rules queries,
  // so any newly triggered alert and updated last_triggered_at show up as soon
  // as the check completes.
  useEffect(() => {
    if (!authReady) return;
    checkAlertRulesMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Supabase Realtime subscription — preserved exactly as before. React Query
  // manages fetching/mutations, NOT realtime. When a row in the alerts table
  // changes (e.g. by POST /api/alert-rules/check on the backend), invalidate
  // the alerts query so React Query refetches the authoritative list rather
  // than patching from the payload. RLS (confirmed active on the alerts table)
  // scopes the channel to the authenticated user's own organization — no
  // cross-org data leaks through the real-time channel.
  useEffect(() => {
    if (!authReady) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
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
    // Fire-and-forget: the hook applies the optimistic `isRead` flip and
    // reverts on failure. Intentionally not awaited (non-blocking UX).
    markAlertReadMutation.mutate(id);
  };

  const handleDismiss = (id: string) => {
    // Fire-and-forget: the hook optimistically removes the alert and restores
    // it on failure. Intentionally not awaited (non-blocking UX).
    dismissAlertMutation.mutate(id);
  };

  const handleToggleRule = (id: string) => {
    const targetRule = rules.find((r) => r.id === id);
    if (!targetRule) return;
    // Fire-and-forget: the hook optimistically flips `enabled` and reverts on
    // failure. Intentionally not awaited (non-blocking UX).
    toggleRuleMutation.mutate({ ruleId: id, enabled: !targetRule.enabled });
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

    // Awaited so the modal only closes on success; the hooks invalidate the
    // rule list so the created/updated rule is reflected from the server.
    try {
      if (editingRuleId) {
        await updateRuleMutation.mutateAsync({ ruleId: editingRuleId, rule: payload });
      } else {
        await createRuleMutation.mutateAsync({ ...payload, enabled: true });
      }
      setCreateOpen(false);
      setEditingRuleId(null);
      setNewRule(defaultNewRule);
    } catch (err) {
      console.error('Failed to save alert rule', err);
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

  // Deletes a rule after the confirm dialog. The hook optimistically removes
  // it (restoring on failure); we await so the dialog only closes on success.
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;

    try {
      await deleteRuleMutation.mutateAsync(id);
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete alert rule', err);
      // Keep the confirm dialog open so the user can see something went wrong
      // and retry. The hook's onError already restored the rule in the list.
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
        {isAtLimit('alert_rules', rules.length) ? (
          <Link to="/dashboard/settings" style={{ textDecoration: 'none' }}>
            <Badge variant="error">
              Upgrade to add more rules (Limit: {limits.limits.alert_rules ?? '∞'})
            </Badge>
          </Link>
        ) : (
          <Button onClick={handleOpenCreate}>
            <Plus size={16} />
            Create Alert Rule
          </Button>
        )}
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
