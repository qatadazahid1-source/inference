import { useState, useEffect, useCallback, useRef } from 'react';
import { CreditCard, Check, Download } from 'lucide-react';

import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { createCheckoutSession } from '../../../services/billing';
import {
  useOrganizationDetail,
  useUpdateOrganization,
  type BillingAddress,
} from '../../../hooks/queries/useOrganization';
import {
  usePlans,
  useSubscription,
  useInvoices,
  usePaymentMethods,
  useOrganizationAccess,
  usePaymentMethodUrl,
  useCancelSubscription,
  useResumeSubscription,
} from '../../../hooks/queries/useBilling';
import type { Invoice } from '../../../types/database.types';
import styles from './Billing.module.css';

const statusVariant: Record<Invoice['status'], 'success' | 'warning' | 'error' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'neutral',
};

function messageFrom(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function Billing() {
  const { addToast } = useToast();

  // ---------------------------------------------------------------------------
  // Server state (React Query). Organization detail (id / canEdit / tax_id /
  // billing_address) is read via the C7 hook; the billing reads come from the
  // C10 useBilling hooks. See useBilling.ts for the Axios-vs-Supabase split.
  // ---------------------------------------------------------------------------
  const { data: orgDetail, isLoading: orgLoading } = useOrganizationDetail();

  const orgId = (orgDetail?.id as string | undefined) ?? null;
  const canEdit = !!orgDetail?.canEdit;

  const { data: subscription = null, isLoading: subLoading } = useSubscription(orgId);
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(orgId);
  const { data: paymentMethods = [], isLoading: pmLoading } = usePaymentMethods(orgId);
  // Trial/access state is only relevant when there is no active subscription;
  // gate the query so it never runs (and never 404s the UI) otherwise.
  const { data: trialAccess = null } = useOrganizationAccess(
    !!orgId && !subLoading && !subscription,
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const paymentMethodUrl = usePaymentMethodUrl();
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();
  const updateOrganization = useUpdateOrganization();

  // ---------------------------------------------------------------------------
  // Local UI state
  // ---------------------------------------------------------------------------
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState<BillingAddress>({});
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Seed the editable billing-info form once from the fetched org detail.
  // A ref guard prevents a later cache refetch/invalidation from clobbering
  // in-progress edits; the save mutation returns the persisted values anyway.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !orgDetail?.id) return;
    setTaxId((orgDetail.tax_id as string | undefined) ?? '');
    setAddress((orgDetail.billing_address as BillingAddress | undefined) ?? {});
    seededRef.current = true;
  }, [orgDetail]);

  const isLoading =
    orgLoading || (!!orgId && (subLoading || plansLoading || invoicesLoading || pmLoading));

  // Returning from Lemon Squeezy Checkout redirects here with ?success=true
  // (redirect_url in create-checkout-session), or the user just closes the
  // checkout tab on their own — Lemon Squeezy has no cancel_url concept, so
  // ?cancelled=true is only reachable if it's ever added back deliberately.
  // Show a toast and strip the param so a page refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      addToast('Subscription updated — this can take a few seconds to reflect below', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('cancelled') === 'true') {
      addToast('Checkout cancelled — no changes were made', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = useCallback(async (planId: string) => {
    if (!orgId) return;
    setCheckoutLoadingPlanId(planId);
    try {
      const { url, error } = await createCheckoutSession(planId, orgId, subscription?.billing_cycle === 'annual' ? 'annual' : 'monthly');
      if (error || !url) throw new Error(error || 'Could not start checkout');
      window.location.href = url;
    } catch (err) {
      // Surfacing the real checkout error here (e.g. a plan missing its
      // Lemon Squeezy variant ID) rather than masking it with a generic
      // "something went wrong" message.
      addToast(messageFrom(err, 'Checkout failed'), 'error');
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  }, [orgId, subscription, addToast]);

  // Arriving here with ?autoupgrade=<slug> means the user picked a plan on
  // the public pricing page before signing up (see PricingSection.tsx →
  // SignUp.tsx → Callback.tsx / Onboarding.tsx, which carry the choice
  // through via localStorage since it can't survive the OAuth redirect any
  // other way). Once plans have loaded, kick off checkout for that plan
  // automatically instead of dropping them on a plain billing page with no
  // indication anything happened.
  const autoUpgradeTriggered = useRef(false);
  useEffect(() => {
    if (autoUpgradeTriggered.current || !orgId || plans.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('autoupgrade');
    if (!slug) return;

    const plan = plans.find((p) => p.slug === slug);
    window.history.replaceState({}, '', window.location.pathname);
    autoUpgradeTriggered.current = true;

    if (!plan) {
      addToast(`Couldn't find the "${slug}" plan — pick one below instead`, 'error');
      return;
    }
    handleUpgrade(plan.id);
  }, [orgId, plans, handleUpgrade, addToast]);

  const handleManagePaymentMethod = useCallback(async () => {
    try {
      const url = await paymentMethodUrl.mutateAsync();
      window.location.href = url;
    } catch (err) {
      addToast(messageFrom(err, 'Could not open payment method page'), 'error');
    }
  }, [paymentMethodUrl, addToast]);

  const handleCancelSubscription = useCallback(async (immediate: boolean) => {
    try {
      await cancelSubscription.mutateAsync({ immediate });
      addToast(
        immediate ? 'Subscription cancelled' : 'Subscription will end at the close of this billing period',
        'success',
      );
      setCancelModalOpen(false);
    } catch (err) {
      addToast(messageFrom(err, 'Failed to cancel subscription'), 'error');
    }
  }, [cancelSubscription, addToast]);

  const handleResumeSubscription = useCallback(async () => {
    try {
      await resumeSubscription.mutateAsync();
      addToast('Subscription resumed', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to resume subscription'), 'error');
    }
  }, [resumeSubscription, addToast]);

  const handleSaveBillingInfo = useCallback(async () => {
    try {
      await updateOrganization.mutateAsync({ tax_id: taxId, billing_address: address });
      addToast('Billing information saved', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to save billing information'), 'error');
    }
  }, [taxId, address, updateOrganization, addToast]);

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
            <div className={styles.planName}>
              {subscription?.plan?.name ?? (trialAccess?.source === 'trial' ? 'Free Trial' : 'No active plan')}
            </div>
            {subscription && <Badge variant="purple">{subscription.status}</Badge>}
            {!subscription && trialAccess?.source === 'trial' && <Badge variant="warning">trial</Badge>}
            {!subscription && trialAccess?.source === 'none' && <Badge variant="error">expired</Badge>}
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
                  : subscription.status === 'cancelled' && subscription.cancelled_at
                    ? `Access until: ${new Date(subscription.cancelled_at).toLocaleDateString()}`
                    : `Next renewal: ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </div>
            </div>
          )}
          {!subscription && trialAccess?.source === 'trial' && trialAccess.trialEndsAt && (
            <div style={{ textAlign: 'right' }}>
              <div className={styles.planDetail}>
                {trialAccess.daysLeft} day{trialAccess.daysLeft === 1 ? '' : 's'} left
              </div>
              <div className={styles.planDetail}>
                Ends {new Date(trialAccess.trialEndsAt).toLocaleDateString()}
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

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {canEdit && <Button onClick={() => setUpgradeModalOpen(true)}>Upgrade Plan</Button>}
          {canEdit && subscription && subscription.status !== 'cancelled' && (
            <Button variant="ghost" onClick={() => setCancelModalOpen(true)}>
              Cancel Subscription
            </Button>
          )}
          {canEdit && subscription?.status === 'cancelled' && subscription.cancelled_at && new Date(subscription.cancelled_at) > new Date() && (
            <Button variant="secondary" isLoading={resumeSubscription.isPending} onClick={handleResumeSubscription}>
              Resume Subscription
            </Button>
          )}
        </div>
      </div>

      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Subscription" size="small">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Choose how you'd like to cancel:
          </p>
          <button
            type="button"
            onClick={() => handleCancelSubscription(false)}
            disabled={cancelSubscription.isPending}
            style={{
              textAlign: 'left', padding: 16, borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-card)', cursor: 'pointer', color: 'var(--color-text-primary)',
            }}
          >
            <div style={{ fontWeight: 'var(--fw-semibold)' as string, marginBottom: 4 }}>
              Cancel at end of billing period
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {subscription
                ? `Keep access until ${new Date(subscription.current_period_end).toLocaleDateString()}, then it won't renew.`
                : "Keep access until the current period ends, then it won't renew."}
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleCancelSubscription(true)}
            disabled={cancelSubscription.isPending}
            style={{
              textAlign: 'left', padding: 16, borderRadius: 8, border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.06)', cursor: 'pointer', color: 'var(--color-text-primary)',
            }}
          >
            <div style={{ fontWeight: 'var(--fw-semibold)' as string, marginBottom: 4, color: '#ef4444' }}>
              Cancel immediately
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Access ends right now, even if you've already paid for time remaining in this period.
            </div>
          </button>
        </div>
      </Modal>

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
        <div style={{ marginTop: 16 }}>
          <Button
            variant="secondary"
            size="sm"
            isLoading={paymentMethodUrl.isPending}
            onClick={handleManagePaymentMethod}
          >
            {defaultPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
          </Button>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Opens Lemon Squeezy's secure page — your card details are never
            stored on our servers.
          </p>
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
            <Button isLoading={updateOrganization.isPending} onClick={handleSaveBillingInfo}>Save Billing Information</Button>
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
