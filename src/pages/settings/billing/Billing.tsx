import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, Download } from 'lucide-react';

import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { supabase } from '../../../lib/supabase';
import { getPlans, getSubscription, getInvoices, getPaymentMethods, createCheckoutSession } from '../../../services/billing';
import type { Plan, Invoice, PaymentMethod, Subscription } from '../../../types/database.types';
import styles from './Billing.module.css';

const statusVariant: Record<Invoice['status'], 'success' | 'warning' | 'error' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'neutral',
};

interface BillingAddress {
  legalName?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export function Billing() {
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState<BillingAddress>({});
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  const [subscription, setSubscription] = useState<(Subscription & { plan: Plan | null }) | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const org = await authedFetch('/api/organization');
      setOrgId(org.data.id);
      setCanEdit(!!org.data.canEdit);
      setTaxId(org.data.tax_id ?? '');
      setAddress((org.data.billing_address as BillingAddress) ?? {});

      const [subRes, plansRes, invoicesRes, pmRes] = await Promise.all([
        getSubscription(org.data.id),
        getPlans(),
        getInvoices(org.data.id, { limit: 20 }),
        getPaymentMethods(org.data.id),
      ]);

      if (subRes.error) throw new Error(subRes.error);
      setSubscription(subRes.data);
      setPlans(plansRes.data ?? []);
      setInvoices(invoicesRes.data ?? []);
      setPaymentMethods(pmRes.data ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load billing info', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpgrade = useCallback(async (planId: string) => {
    if (!orgId) return;
    setCheckoutLoadingPlanId(planId);
    try {
      const { url, error } = await createCheckoutSession(planId, orgId, subscription?.billing_cycle === 'annual' ? 'annual' : 'monthly');
      if (error || !url) throw new Error(error || 'Could not start checkout');
      window.location.href = url;
    } catch (err) {
      // Known issue: create-checkout-session currently uses mode: 'payment'
      // instead of mode: 'subscription' for recurring prices, which Stripe
      // rejects. That's tracked separately as a Payment System bug fix —
      // surfacing the real error here rather than masking it.
      addToast(err instanceof Error ? err.message : 'Checkout failed', 'error');
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  }, [orgId, subscription, addToast]);

  const handleSaveBillingInfo = useCallback(async () => {
    setIsSavingBilling(true);
    try {
      await authedFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({ tax_id: taxId, billing_address: address }),
      });
      addToast('Billing information saved', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save billing information', 'error');
    } finally {
      setIsSavingBilling(false);
    }
  }, [taxId, address, addToast]);

  const defaultPaymentMethod = paymentMethods.find((pm) => pm.is_default) ?? paymentMethods[0] ?? null;

  const usedFeatureList: string[] = subscription?.plan
    ? Object.entries(subscription.plan.features ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, ' '))
    : [];

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height="28px" width="160px" />
        <div style={{ marginTop: 24 }}><Skeleton height="240px" /></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Billing</h1>
      <p className={styles.subtext}>
        Manage your subscription, payment methods, and billing history.
      </p>

      <h2 className={styles.sectionTitle}>Current Plan</h2>
      <div className={styles.planCard}>
        <div className={styles.planHeader}>
          <div>
            <div className={styles.planName}>{subscription?.plan?.name ?? 'No active plan'}</div>
            {subscription && <Badge variant="purple">{subscription.status}</Badge>}
          </div>
          {subscription?.plan && (
            <div style={{ textAlign: 'right' }}>
              <div className={styles.planPrice}>
                ${subscription.billing_cycle === 'annual' ? subscription.plan.price_annual : subscription.plan.price_monthly}
                <span className={styles.planPriceSub}>/{subscription.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
              </div>
              <div className={styles.planDetail}>{subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'}</div>
              <div className={styles.planDetail}>
                {subscription.status === 'trialing' && subscription.trial_ends_at
                  ? `Trial ends: ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                  : `Next renewal: ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </div>
            </div>
          )}
        </div>

        {usedFeatureList.length > 0 && (
          <div className={styles.featureList}>
            {usedFeatureList.map((f) => (
              <div key={f} className={styles.featureItem}>
                <Check size={16} className={styles.featureCheck} />
                {f}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          {canEdit && <Button onClick={() => setUpgradeModalOpen(true)}>Upgrade Plan</Button>}
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Payment Method</h2>
      <div className={styles.card}>
        <div className={styles.paymentCard}>
          <CreditCard size={24} className={styles.cardIcon} />
          <div className={styles.cardInfo}>
            <div className={styles.cardNumber}>
              {defaultPaymentMethod
                ? `${defaultPaymentMethod.card_brand ?? 'Card'} •••• ${defaultPaymentMethod.card_last_four ?? '----'}`
                : 'No payment method'}
            </div>
            <div className={styles.cardExpiry}>
              {defaultPaymentMethod
                ? `Expires ${defaultPaymentMethod.expiry_month}/${defaultPaymentMethod.expiry_year}`
                : 'Add a card to enable paid usage'}
            </div>
          </div>
          {defaultPaymentMethod && <Badge variant="success">Default</Badge>}
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Billing History</h2>
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--fw-medium)' as string }}>
                      {inv.invoice_number}
                    </td>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td>{inv.description || '—'}</td>
                    <td>${Number(inv.amount).toFixed(2)}</td>
                    <td>
                      <Badge variant={statusVariant[inv.status]}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                    <td>
                      {inv.pdf_url ? (
                        <a className={styles.downloadLink} href={inv.pdf_url} target="_blank" rel="noreferrer">
                          <Download size={14} />
                          PDF
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                    No billing history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Billing Information</h2>
      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Company Legal Name</label>
            <input
              className={styles.input}
              type="text"
              value={address.legalName ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, legalName: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>VAT/Tax ID</label>
            <input
              className={styles.input}
              type="text"
              value={taxId}
              disabled={!canEdit}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>Street Address</label>
            <input
              className={styles.input}
              type="text"
              value={address.street ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>City</label>
            <input
              className={styles.input}
              type="text"
              value={address.city ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>State</label>
            <input
              className={styles.input}
              type="text"
              value={address.state ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>ZIP / Postal Code</label>
            <input
              className={styles.input}
              type="text"
              value={address.zip ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Country</label>
            <input
              className={styles.input}
              type="text"
              placeholder="US"
              value={address.country ?? ''}
              disabled={!canEdit}
              onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
            />
          </div>
        </div>
        {canEdit && (
          <div style={{ marginTop: 24 }}>
            <Button isLoading={isSavingBilling} onClick={handleSaveBillingInfo}>Save Billing Information</Button>
          </div>
        )}
      </div>

      <Modal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} title="Choose a plan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 16, border: '1px solid var(--color-border)', borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)' as string }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  ${plan.price_monthly}/mo
                </div>
              </div>
              <Button
                size="sm"
                isLoading={checkoutLoadingPlanId === plan.id}
                disabled={subscription?.plan_id === plan.id}
                onClick={() => handleUpgrade(plan.id)}
              >
                {subscription?.plan_id === plan.id ? 'Current Plan' : 'Select'}
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
