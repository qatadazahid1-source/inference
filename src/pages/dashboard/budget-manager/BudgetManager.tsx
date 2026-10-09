import { useState } from 'react';
import { Bell, MoreVertical, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Modal } from '../../../components/ui/Modal/Modal';
import { GridContainer, GridItem } from '../../../components/layout/Grid';
import { KPICard } from '../../../components/dashboard/KPICard/KPICard';

import type { Budget } from '../../../types/dashboard.types';
import { useAuth } from '../../../hooks/useAuth';
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../../../hooks/queries/useBudgets';
import styles from './BudgetManager.module.css';

const scopeVariants: Record<string, 'success' | 'warning' | 'error' | 'neutral' | 'purple'> = {
  organization: 'neutral',
  team: 'purple',
  project: 'success',
  provider: 'warning',
  model: 'error',
};

const defaultForm = {
  name: '',
  scope: 'organization' as Budget['scope'],
  scopeValue: '',
  amount: '',
  period: 'monthly' as Budget['period'],
  alertThresholds: [] as number[],
  hardLimit: false,
};

function formatCurrency(val: number): string {
  const num = Number(val) || 0;
  if (num === 0) return '$0.00';
  if (Math.abs(num) < 0.01) {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`;
  }
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BudgetManager() {
  const { user } = useAuth();
  const authReady = !!user?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const budgetsQuery = useBudgets(authReady);
  const budgets = budgetsQuery.data ?? [];
  const isLoading = budgetsQuery.isPending;

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const totalAllocated = budgets.reduce((acc: number, b: any) => acc + (Number(b.total_budget) || 0), 0);
  const activeSpend = budgets.reduce((acc: number, b: any) => acc + (Number(b.current_spend) || 0), 0);
  const utilizationPct = totalAllocated > 0 ? (activeSpend / totalAllocated) * 100 : 0;

  const handleCreate = () => {
    setEditingBudgetId(null);
    setForm({ ...defaultForm });
    setShowCreate(true);
  };

  const handleEdit = (budget: any) => {
    setOpenMenu(null);
    setEditingBudgetId(budget.id);
    setForm({
      name: budget.name || '',
      scope: (budget.scope || 'organization') as Budget['scope'],
      scopeValue: budget.scope_value || '',
      amount: String(budget.total_budget ?? ''),
      period: budget.period || 'monthly',
      alertThresholds: [50, 75, 90, 100].filter((t) => budget[`alert_at_${t}`]),
      hardLimit: !!budget.hard_limit,
    });
    setShowCreate(true);
  };

  const handleDelete = async (budgetId: string) => {
    setOpenMenu(null);
    const confirmed = window.confirm('Delete this budget? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingId(budgetId);
      // The mutation optimistically removes the card from the cached list, so
      // the UI reflects the deletion immediately without waiting on the poll.
      await deleteBudget.mutateAsync(budgetId);
    } catch (err) {
      console.error('Failed to delete budget:', err);
      alert('Failed to delete budget. See console for details.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numAmount = Number(form.amount);
      if (isNaN(numAmount) || numAmount < 0.001) {
        alert('Budget amount must be a positive number of at least $0.001.');
        return;
      }

      const payload = {
        name: form.name.trim(),
        scope: form.scope,
        scope_value: form.scopeValue.trim() || null,
        total_budget: numAmount,
        period: form.period,
        alert_at_50: form.alertThresholds.includes(50),
        alert_at_75: form.alertThresholds.includes(75),
        alert_at_90: form.alertThresholds.includes(90),
        alert_at_100: form.alertThresholds.includes(100),
        hard_limit: form.hardLimit,
      };

      if (editingBudgetId) {
        await updateBudget.mutateAsync({ budgetId: editingBudgetId, budget: payload });
      } else {
        await createBudget.mutateAsync(payload);
      }

      setShowCreate(false);
      setEditingBudgetId(null);
    } catch (err: any) {
      console.error('Failed to save budget:', err);
      const errMsg = err?.response?.data?.error || err?.message || `Failed to ${editingBudgetId ? 'update' : 'create'} budget. See console for details.`;
      alert(errMsg);
    }
  };

  const toggleThreshold = (t: number) => {
    setForm((f) => ({
      ...f,
      alertThresholds: f.alertThresholds.includes(t)
        ? f.alertThresholds.filter((v) => v !== t)
        : [...f.alertThresholds, t],
    }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Budget Manager</h1>
        <Button onClick={handleCreate}>
          <Plus size={16} />
          Create Budget
        </Button>
      </div>

      {!isLoading && budgets.length > 0 && (
        <GridContainer className={styles.summaryGrid}>
          <GridItem span={4}>
            <KPICard
              data={{
                label: 'Total Allocated Budget',
                value: formatCurrency(totalAllocated),
                icon: 'DollarSign',
                isPrimary: true,
                trendText: `${budgets.length} active budget${budgets.length === 1 ? '' : 's'}`,
              }}
            />
          </GridItem>
          <GridItem span={4}>
            <KPICard
              data={{
                label: 'Active Spend',
                value: formatCurrency(activeSpend),
                icon: 'Activity',
                isPrimary: false,
                trendText: 'Current billing period',
              }}
            />
          </GridItem>
          <GridItem span={4}>
            <KPICard
              data={{
                label: 'Overall Utilization',
                value: `${utilizationPct >= 100 ? Math.round(utilizationPct) : utilizationPct.toFixed(1)}%`,
                icon: 'Target',
                isPrimary: false,
                trendText: utilizationPct > 100 ? 'Over budget' : 'Capacity consumed',
              }}
            />
          </GridItem>
        </GridContainer>
      )}

      {isLoading ? (
        <div className={styles.empty}>
          <p>Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className={styles.empty}>
          <p>No budgets yet</p>
          <Button onClick={handleCreate}>
            <Plus size={16} />
            Create Budget
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {budgets.map((b: any) => {
            // Guard against division by zero: a $0 budget would otherwise
            // produce NaN% (0/0), which broke the progress bar and label.
            const budgetNum = Number(b.total_budget) || 0;
            const spendNum = Number(b.current_spend) || 0;
            const pct = budgetNum > 0 ? (spendNum / budgetNum) * 100 : 0;
            const visualWidth = Math.min(Math.max(pct, 0), 100);

            let fillClass = styles.progressGreen;
            if (pct >= 90) fillClass = styles.progressRed;
            else if (pct >= 75) fillClass = styles.progressAmber;

            const scopeKey = b.scope || 'organization';
            const scopeDisplay = b.scope_value ? `${scopeKey}: ${b.scope_value}` : (scopeKey.charAt(0).toUpperCase() + scopeKey.slice(1));

            return (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.cardName}>{b.name || 'Budget'}</div>
                    <Badge variant={scopeVariants[scopeKey] || 'neutral'}>{scopeDisplay}</Badge>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Bell size={16} style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }} />
                    <button
                      className={styles.kebabBtn}
                      onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                      disabled={deletingId === b.id}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === b.id && (
                      <div className={styles.dropdown}>
                        <button className={styles.dropdownItem} onClick={() => handleEdit(b)}>
                          Edit
                        </button>
                        <button className={styles.dropdownItem} onClick={() => handleDelete(b.id)}>
                          {deletingId === b.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.cardAmount}>
                  {formatCurrency(budgetNum)} / {b.period || 'month'}
                </div>
                <div className={styles.progressWrap}>
                  <div className={`${styles.progressFill} ${fillClass}`} style={{ width: `${visualWidth}%` }} />
                </div>
                <div className={styles.usedText}>
                  {pct >= 100 ? Math.round(pct) : pct.toFixed(1)}% used ({formatCurrency(spendNum)} of {formatCurrency(budgetNum)})
                </div>
                <div className={styles.cardActions} />
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingBudgetId(null);
        }}
        title={editingBudgetId ? 'Edit Budget' : 'Create Budget'}
        size="medium"
      >
        <form onSubmit={handleFormSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Budget Name</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. OpenAI Monthly"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Scope</label>
            <select
              className={styles.select}
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as Budget['scope'] }))}
            >
              <option value="organization">Organization</option>
              <option value="team">Team</option>
              <option value="project">Project</option>
              <option value="provider">Provider</option>
              <option value="model">Model</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Scope Value</label>
            <input
              className={styles.input}
              value={form.scopeValue}
              onChange={(e) => setForm((f) => ({ ...f, scopeValue: e.target.value }))}
              placeholder="e.g. OpenAI"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Amount ($)</label>
            <input
              className={styles.input}
              type="number"
              step="any"
              min="0.001"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="10.00"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Period</label>
            <div className={styles.radioGroup}>
              {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
                <label key={p} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="period"
                    checked={form.period === p}
                    onChange={() => setForm((f) => ({ ...f, period: p }))}
                  />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Alert Thresholds</label>
            <div className={styles.checkboxGroup}>
              {[50, 75, 90, 100].map((t) => (
                <label key={t} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.alertThresholds.includes(t)}
                    onChange={() => toggleThreshold(t)}
                  />
                  {t}%
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.hardLimit}
                onChange={(e) => setForm((f) => ({ ...f, hardLimit: e.target.checked }))}
              />
              Hard limit (block requests when exceeded)
            </label>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingBudgetId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">{editingBudgetId ? 'Save Changes' : 'Create Budget'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
