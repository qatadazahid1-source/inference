import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Star, ToggleLeft, ToggleRight, X, GripVertical } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import styles from './AdminLandingPricing.module.css';

interface DisplayFeature {
  text: string;
  included: boolean;
}

interface SystemLimits {
  limits: {
    integrations: number | null;
    platform_keys: number | null;
    alert_rules: number | null;
    budget_rules: number | null;
    team_members: number | null;
    monthly_spend_usd: number | null;
  };
  usage: { warning_threshold_percent: number; };
  features: {
    api_gateway: boolean;
    analytics: boolean;
    advanced_analytics: boolean;
    alerts: boolean;
    budget_manager: boolean;
    ai_playground: boolean;
    benchmarks: boolean;
    roi_calculator: boolean;
    reports: boolean;
    csv_export: boolean;
    pdf_export: boolean;
    premium_models: boolean;
    webhooks: boolean;
    slack_alerts: boolean;
    cost_spike_detection: boolean;
    anomaly_detection: boolean;
  };
  rate_limits: {
    requests_per_minute: number | null;
    concurrent_requests: number | null;
  };
  model_access: { tier: string; };
}

interface LandingPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_annual: number;
  tagline: string | null;
  is_popular: boolean;
  cta_text: string | null;
  cta_variant: string | null;
  sort_order: number;
  display_features: DisplayFeature[] | null;
  system_limits: SystemLimits | null;
  lemonsqueezy_variant_id_monthly: string | null;
  lemonsqueezy_variant_id_annual: string | null;
  is_active: boolean;
}

type ModalMode = 'add' | 'edit';

const EMPTY_PLAN = {
  name: '',
  slug: '',
  price_monthly: 0,
  price_annual: 0,
  tagline: '',
  is_popular: false,
  cta_text: 'Start Free Trial',
  cta_variant: 'ghost',
  sort_order: 0,
  display_features: [] as DisplayFeature[],
  system_limits: {
    limits: { integrations: 1, platform_keys: 1, alert_rules: 1, budget_rules: 1, team_members: 1, monthly_spend_usd: 100 },
    usage: { warning_threshold_percent: 80 },
    features: {
      api_gateway: true, analytics: true, advanced_analytics: false, alerts: true, budget_manager: true,
      ai_playground: true, benchmarks: false, roi_calculator: false, reports: true, csv_export: false,
      pdf_export: false, premium_models: false, webhooks: false, slack_alerts: false, cost_spike_detection: false, anomaly_detection: false
    },
    rate_limits: { requests_per_minute: 60, concurrent_requests: 2 },
    model_access: { tier: 'basic' }
  } as SystemLimits,
  lemonsqueezy_variant_id_monthly: '',
  lemonsqueezy_variant_id_annual: '',
};

export function AdminLandingPricingPage() {
  const [plans, setPlans] = useState<LandingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_PLAN>({ ...EMPTY_PLAN });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getLandingPlans();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openAdd = () => {
    setForm({ ...EMPTY_PLAN, sort_order: plans.length + 1 });
    setModalMode('add');
    setEditingId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (plan: LandingPlan) => {
    setForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      tagline: plan.tagline ?? '',
      is_popular: plan.is_popular,
      cta_text: plan.cta_text ?? 'Start Free Trial',
      cta_variant: plan.cta_variant ?? 'ghost',
      sort_order: plan.sort_order,
      display_features: Array.isArray(plan.display_features) ? plan.display_features : [],
      system_limits: plan.system_limits ?? {
        limits: { integrations: 0, platform_keys: 0, alert_rules: 0, budget_rules: 0, team_members: 0, monthly_spend_usd: 0 },
        usage: { warning_threshold_percent: 80 },
        features: {
          api_gateway: false, analytics: false, advanced_analytics: false, alerts: false, budget_manager: false,
          ai_playground: false, benchmarks: false, roi_calculator: false, reports: false, csv_export: false,
          pdf_export: false, premium_models: false, webhooks: false, slack_alerts: false, cost_spike_detection: false, anomaly_detection: false
        },
        rate_limits: { requests_per_minute: 0, concurrent_requests: 0 },
        model_access: { tier: 'basic' }
      },
      lemonsqueezy_variant_id_monthly: plan.lemonsqueezy_variant_id_monthly ?? '',
      lemonsqueezy_variant_id_annual: plan.lemonsqueezy_variant_id_annual ?? '',
    });
    setModalMode('edit');
    setEditingId(plan.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Name and slug are required.');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        lemonsqueezy_variant_id_monthly: form.lemonsqueezy_variant_id_monthly || undefined,
        lemonsqueezy_variant_id_annual: form.lemonsqueezy_variant_id_annual || undefined,
      };
      if (modalMode === 'add') {
        await adminService.createLandingPlan(payload as any);
      } else if (editingId) {
        await adminService.updateLandingPlan(editingId, payload as any);
      }
      setModalOpen(false);
      await fetchPlans();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: LandingPlan) => {
    setSavingId(plan.id);
    try {
      await adminService.updateLandingPlan(plan.id, { is_active: !plan.is_active });
      await fetchPlans();
    } catch (err) {
      console.error('[AdminLandingPricing] toggle error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleTogglePopular = async (plan: LandingPlan) => {
    setSavingId(plan.id);
    try {
      // Only one plan can be popular — unset others first
      await Promise.all(
        plans.filter(p => p.is_popular && p.id !== plan.id)
          .map(p => adminService.updateLandingPlan(p.id, { is_popular: false }))
      );
      await adminService.updateLandingPlan(plan.id, { is_popular: !plan.is_popular });
      await fetchPlans();
    } catch (err) {
      console.error('[AdminLandingPricing] toggle popular error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSavingId(confirmDelete.id);
    try {
      await adminService.deleteLandingPlan(confirmDelete.id);
      setConfirmDelete(null);
      await fetchPlans();
    } catch (err) {
      console.error('[AdminLandingPricing] delete error:', err);
    } finally {
      setSavingId(null);
    }
  };

  // Feature list helpers
  const addFeature = () =>
    setForm(f => ({ ...f, display_features: [...f.display_features, { text: '', included: true }] }));

  const updateFeature = (i: number, field: 'text' | 'included', value: string | boolean) =>
    setForm(f => {
      const features = [...f.display_features];
      features[i] = { ...features[i], [field]: value };
      return { ...f, display_features: features };
    });

  const removeFeature = (i: number) =>
    setForm(f => ({ ...f, display_features: f.display_features.filter((_, idx) => idx !== i) }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Landing Pricing Plans</h1>
          <p className={styles.subtitle}>
            Edit the plan cards shown on the public pricing section — changes go live immediately, no deploy needed.
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <Plus size={16} /> Add Plan
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {isLoading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : plans.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No plans found.</p>
          <p>Run the migration <code>00007_extend_plans_for_landing_page.sql</code> and seed your plans table, or click "Add Plan" to create one manually.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Name / Slug</th>
                <th>Monthly</th>
                <th>Annual</th>
                <th>Tagline</th>
                <th>Popular</th>
                <th>CTA</th>
                <th>LS Variant IDs</th>
                <th>Visible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className={!plan.is_active ? styles.rowInactive : ''}>
                  <td className={styles.tdCenter}>
                    <span className={styles.sortHandle}><GripVertical size={14} /></span>
                    {plan.sort_order}
                  </td>
                  <td>
                    <div className={styles.planNameCell}>
                      <strong>{plan.name}</strong>
                      <code className={styles.slug}>{plan.slug}</code>
                    </div>
                  </td>
                  <td>${plan.price_monthly}/mo</td>
                  <td>${plan.price_annual}/mo</td>
                  <td className={styles.tdTagline}>{plan.tagline || <span className={styles.empty}>—</span>}</td>
                  <td className={styles.tdCenter}>
                    <button
                      className={`${styles.popularBtn} ${plan.is_popular ? styles.popularOn : ''}`}
                      onClick={() => handleTogglePopular(plan)}
                      disabled={savingId === plan.id}
                      title={plan.is_popular ? 'Remove "Most Popular" badge' : 'Mark as Most Popular'}
                    >
                      <Star size={15} fill={plan.is_popular ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td>
                    <span className={styles.ctaBadge}>{plan.cta_text}</span>
                  </td>
                  <td className={styles.tdVariants}>
                    <div className={styles.variantId}>
                      <span className={styles.variantLabel}>Monthly:</span>
                      <code>{plan.lemonsqueezy_variant_id_monthly || <span className={styles.missing}>not set</span>}</code>
                    </div>
                    <div className={styles.variantId}>
                      <span className={styles.variantLabel}>Annual:</span>
                      <code>{plan.lemonsqueezy_variant_id_annual || <span className={styles.missing}>not set</span>}</code>
                    </div>
                  </td>
                  <td className={styles.tdCenter}>
                    <button
                      className={styles.toggleBtn}
                      onClick={() => handleToggleActive(plan)}
                      disabled={savingId === plan.id}
                      title={plan.is_active ? 'Hide from landing page' : 'Show on landing page'}
                    >
                      {plan.is_active
                        ? <ToggleRight size={20} className={styles.toggleOn} />
                        : <ToggleLeft size={20} className={styles.toggleOff} />}
                    </button>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className={styles.btnIcon} onClick={() => openEdit(plan)} title="Edit plan">
                        <Pencil size={14} />
                      </button>
                      <button
                        className={styles.btnIconDanger}
                        onClick={() => setConfirmDelete({ id: plan.id, name: plan.name })}
                        disabled={savingId === plan.id}
                        title="Deactivate plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={() => !isSaving && setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalMode === 'add' ? 'Add Plan' : 'Edit Plan'}</h2>
              <button className={styles.closeBtn} onClick={() => !isSaving && setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {formError && <div className={styles.errorBanner}>{formError}</div>}

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Professional" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Slug *</label>
                  <input className={styles.input} value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))} placeholder="professional" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Monthly Price ($)</label>
                  <input className={styles.input} type="number" min="0" value={form.price_monthly}
                    onChange={e => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Annual Price ($/mo billed annually)</label>
                  <input className={styles.input} type="number" min="0" value={form.price_annual}
                    onChange={e => setForm(f => ({ ...f, price_annual: Number(e.target.value) }))} />
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Tagline</label>
                  <input className={styles.input} value={form.tagline}
                    onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="For growing teams" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>CTA Button Text</label>
                  <input className={styles.input} value={form.cta_text}
                    onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Start Free Trial" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>CTA Variant</label>
                  <select className={styles.input} value={form.cta_variant}
                    onChange={e => setForm(f => ({ ...f, cta_variant: e.target.value }))}>
                    <option value="primary">primary (filled)</option>
                    <option value="ghost">ghost (outline)</option>
                    <option value="enterprise">enterprise (dark)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sort Order</label>
                  <input className={styles.input} type="number" min="0" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Lemon Squeezy Monthly Variant ID</label>
                  <input className={styles.input} value={form.lemonsqueezy_variant_id_monthly}
                    onChange={e => setForm(f => ({ ...f, lemonsqueezy_variant_id_monthly: e.target.value }))}
                    placeholder="e.g. 123456" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Lemon Squeezy Annual Variant ID</label>
                  <input className={styles.input} value={form.lemonsqueezy_variant_id_annual}
                    onChange={e => setForm(f => ({ ...f, lemonsqueezy_variant_id_annual: e.target.value }))}
                    placeholder="e.g. 789012" />
                </div>

                <div className={`${styles.field} ${styles.checkField}`}>
                  <input type="checkbox" id="is_popular" checked={form.is_popular}
                    onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} />
                  <label htmlFor="is_popular">Mark as "Most Popular"</label>
                </div>
              </div>

              {/* System Entitlements (actual backend limits) */}
              <div className={styles.featuresSection}>
                <div className={styles.featuresSectionHead}>
                  <span className={styles.label}>⚙️ System Entitlements (Backend Limits)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  These limits are enforced by the backend. Users on this plan cannot exceed them.
                </p>
                <div className={styles.formGrid}>
                  {/* Limits */}
                  <div className={styles.field}>
                    <label className={styles.label}>Max Integrations (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.integrations ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, integrations: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Max Platform Keys (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.platform_keys ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, platform_keys: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Max Alert Rules (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.alert_rules ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, alert_rules: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Max Budget Rules (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.budget_rules ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, budget_rules: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Max Team Members (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.team_members ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, team_members: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Max Monthly Spend ($)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.limits.monthly_spend_usd ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, limits: { ...f.system_limits.limits, monthly_spend_usd: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  
                  {/* Usage */}
                  <div className={styles.field}>
                    <label className={styles.label}>Usage Warning Threshold (%)</label>
                    <input className={styles.input} type="number" min="0" max="100"
                      value={form.system_limits.usage.warning_threshold_percent}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, usage: { ...f.system_limits.usage, warning_threshold_percent: Number(e.target.value) } } }))} />
                  </div>

                  {/* Rate Limits */}
                  <div className={styles.field}>
                    <label className={styles.label}>API Requests / Min (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.rate_limits.requests_per_minute ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, rate_limits: { ...f.system_limits.rate_limits, requests_per_minute: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Concurrent Requests (empty = unlimited)</label>
                    <input className={styles.input} type="number" min="0"
                      value={form.system_limits.rate_limits.concurrent_requests ?? ''}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, rate_limits: { ...f.system_limits.rate_limits, concurrent_requests: e.target.value ? Number(e.target.value) : null } } }))} />
                  </div>
                  
                  {/* Model Access */}
                  <div className={styles.field}>
                    <label className={styles.label}>Model Access Tier</label>
                    <select className={styles.input} value={form.system_limits.model_access.tier}
                      onChange={e => setForm(f => ({ ...f, system_limits: { ...f.system_limits, model_access: { ...f.system_limits.model_access, tier: e.target.value } } }))}>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="all">All Models</option>
                    </select>
                  </div>
                  
                  {/* Feature Toggles */}
                  <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>Feature Toggles</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {Object.keys(form.system_limits.features).map((feat) => (
                        <div key={feat} className={styles.checkField} style={{ margin: 0 }}>
                          <input type="checkbox" id={`feat_${feat}`} 
                            checked={form.system_limits.features[feat as keyof typeof form.system_limits.features]}
                            onChange={e => setForm(f => ({
                              ...f,
                              system_limits: {
                                ...f.system_limits,
                                features: { ...f.system_limits.features, [feat]: e.target.checked }
                              }
                            }))} />
                          <label htmlFor={`feat_${feat}`} style={{ textTransform: 'capitalize' }}>
                            {feat.replace(/_/g, ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Features */}
              <div className={styles.featuresSection}>
                <div className={styles.featuresSectionHead}>
                  <span className={styles.label}>Feature List (Landing Page Display)</span>
                  <button className={styles.btnSmall} onClick={addFeature} type="button">
                    <Plus size={13} /> Add Feature
                  </button>
                </div>
                {form.display_features.length === 0 && (
                  <p className={styles.emptyFeatures}>No features yet. Click "Add Feature" to add bullet points.</p>
                )}
                {form.display_features.map((f, i) => (
                  <div key={i} className={styles.featureRow}>
                    <input
                      className={`${styles.input} ${styles.featureInput}`}
                      value={f.text}
                      onChange={e => updateFeature(i, 'text', e.target.value)}
                      placeholder="e.g. 15 team members"
                    />
                    <select
                      className={styles.featureSelect}
                      value={String(f.included)}
                      onChange={e => updateFeature(i, 'included', e.target.value === 'true')}
                    >
                      <option value="true">✓ Included</option>
                      <option value="false">✗ Not Included</option>
                    </select>
                    <button className={styles.featureRemove} onClick={() => removeFeature(i)} title="Remove">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => !isSaving && setModalOpen(false)} disabled={isSaving}>
                Cancel
              </button>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : modalMode === 'add' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivate */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>
              Deactivate <strong>"{confirmDelete.name}"</strong>? It will be hidden from the landing page but not deleted (subscriptions referencing this plan remain intact).
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.btnDanger} onClick={handleDelete}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLandingPricingPage;
