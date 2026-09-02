import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Card } from '../../../components/ui/Card/Card';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { supabase } from '../../../lib/supabase';
import {
  useOrganizationDetail,
  useUpdateOrganization,
  useUpdateOrganizationLogo,
} from '../../../hooks/queries/useOrganization';
import { ApiError } from '../../../lib/axios';
import styles from './Organization.module.css';

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
  'Manufacturing', 'Media & Entertainment', 'Real Estate', 'Travel & Hospitality', 'Other',
];

const companySizes = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

interface OrgFormState {
  name: string;
  industry: string;
  companySize: string;
  website: string;
  primaryColor: string;
}

function messageFrom(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function Organization() {
  const { addToast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Server state (GET /api/organization) via React Query.
  const { data: org, isLoading, isError, error } = useOrganizationDetail();

  // Mutations (PATCH /api/organization, POST /api/organization/logo).
  const updateOrg = useUpdateOrganization();
  const updateLogo = useUpdateOrganizationLogo();

  // Local UI state.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [form, setForm] = useState<OrgFormState>({
    name: '', industry: '', companySize: '', website: '', primaryColor: '#22c55e',
  });

  const canEdit = !!org?.canEdit;

  // Hydrate the editable form + logo preview from the fetched org detail.
  useEffect(() => {
    if (!org) return;
    setForm({
      name: (org.name as string) ?? '',
      industry: (org.industry as string) ?? '',
      companySize: (org.company_size as string) ?? '',
      website: (org.website as string) ?? '',
      primaryColor: (org.primary_color as string) ?? '#22c55e',
    });
    setLogoUrl((org.logo_url as string | null) ?? null);
  }, [org]);

  // Surface load failures without blocking render of the (empty) form.
  useEffect(() => {
    if (isError) {
      addToast(messageFrom(error, 'Failed to load organization'), 'error');
    }
  }, [isError, error, addToast]);

  const handleSaveGeneral = useCallback(async () => {
    try {
      await updateOrg.mutateAsync({
        name: form.name,
        industry: form.industry,
        company_size: form.companySize,
        website: form.website,
      });
      addToast('Organization details updated', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to save'), 'error');
    }
  }, [form, updateOrg, addToast]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      // Valid Supabase-direct Storage upload — intentionally NOT routed through
      // the backend REST API. Only the resolved public URL is persisted via the
      // authenticated /api/organization/logo endpoint below.
      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('user-content').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-content').getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error('Could not resolve uploaded logo URL');

      await updateLogo.mutateAsync(urlData.publicUrl);

      setLogoUrl(urlData.publicUrl);
      addToast('Logo updated', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to upload logo'), 'error');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  }, [updateLogo, addToast]);

  const handleSaveColor = useCallback(async () => {
    try {
      await updateOrg.mutateAsync({ primary_color: form.primaryColor });
      addToast('Branding updated', 'success');
    } catch (err) {
      addToast(messageFrom(err, 'Failed to save branding'), 'error');
    }
  }, [form.primaryColor, updateOrg, addToast]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height="28px" width="260px" />
        <div style={{ marginTop: 24 }}>
          <Card><Skeleton height="180px" /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Organization Settings</h1>
      <p className={styles.subtext}>Manage your organization profile, branding, and data preferences.</p>

      {!canEdit && (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
          You have view-only access. Ask an organization owner or admin to make changes here.
        </p>
      )}

      <section>
        <h2 className={styles.sectionTitle}>General Information</h2>
        <div className={styles.card}>
          <div className={styles.formGrid}>
            <Input
              label="Company Name"
              value={form.name}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />

            <div className={styles.field}>
              <label className={styles.label}>Industry</label>
              <select
                className={styles.select}
                value={form.industry}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Company Size</label>
              <select
                className={styles.select}
                value={form.companySize}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
              >
                <option value="">Select size</option>
                {companySizes.map((size) => (
                  <option key={size} value={size}>{size} employees</option>
                ))}
              </select>
            </div>

            <Input
              label="Website URL"
              type="url"
              placeholder="https://example.com"
              value={form.website}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </div>

          {canEdit && (
            <Button style={{ marginTop: 24 }} isLoading={updateOrg.isPending} onClick={handleSaveGeneral}>
              Save Changes
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Branding</h2>
        <div className={styles.card}>
          <label className={styles.label}>Company Logo</label>
          <div className={styles.logoPreview}>
            {logoUrl ? (
              <img src={logoUrl} alt="Company logo" />
            ) : (
              <span>No logo</span>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isUploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              Upload Logo
            </Button>
          )}

          <div style={{ marginTop: 24 }}>
            <label className={styles.label}>Primary Color</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={form.primaryColor}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
              />
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                {form.primaryColor}
              </span>
            </div>
          </div>

          {canEdit && (
            <Button style={{ marginTop: 24 }} isLoading={updateOrg.isPending} onClick={handleSaveColor}>
              Save Branding
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Data & Privacy</h2>
        <div className={styles.card}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
            Data retention and privacy controls are planned but not wired to a real setting yet —
            there's no backing column for them in the current database schema. This section will
            go live once that's decided and migrated; not shown here in the meantime so it doesn't
            imply a setting is saved when it isn't.
          </p>
        </div>
      </section>
    </div>
  );
}
