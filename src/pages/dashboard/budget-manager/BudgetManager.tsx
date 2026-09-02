import { useState } from 'react';
import { Bell, MoreVertical, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Modal } from '../../../components/ui/Modal/Modal';

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
      scope: 'organization',
      scopeValue: '',
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
      const payload = {
        name: form.name,
        total_budget: Number(form.amount),
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
    } catch (err) {
      console.error('Failed to save budget:', err);
      alert(`Failed to ${editingBudgetId ? 'update' : 'create'} budget. See console for details.`);
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
            const pct = b.total_budget > 0
              ? Math.min((b.current_spend / b.total_budget) * 100, 100)
              : 0;
            let fillClass = styles.progressGreen;
            if (pct >= 90) fillClass = styles.progressRed;
            else if (pct >= 75) fillClass = styles.progressAmber;

            return (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.cardName}>{b.name || 'Budget'}</div>
                    <Badge variant={scopeVariants['organization']}>Organization</Badge>
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
                  ${b.total_budget.toLocaleString()} / month
                </div>
                <div className={styles.progressWrap}>
                  <div className={`${styles.progressFill} ${fillClass}`} style={{ width: `${pct}%` }} />
                </div>
                <div className={styles.usedText}>{pct.toFixed(0)}% used</div>
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
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="5000"
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
