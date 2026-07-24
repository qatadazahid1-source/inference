import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Card } from '../../../components/ui/Card/Card';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { supabase } from '../../../lib/supabase';
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

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export function Organization() {
  const { addToast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const [form, setForm] = useState<OrgFormState>({
    name: '', industry: '', companySize: '', website: '', primaryColor: '#22c55e',
  });

  const loadOrg = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await authedFetch('/api/organization');
      setForm({
        name: data.name ?? '',
        industry: data.industry ?? '',
        companySize: data.company_size ?? '',
        website: data.website ?? '',
        primaryColor: data.primary_color ?? '#22c55e',
      });
      setLogoUrl(data.logo_url ?? null);
      setCanEdit(!!data.canEdit);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load organization', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const handleSaveGeneral = useCallback(async () => {
    setIsSavingGeneral(true);
    try {
      await authedFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          company_size: form.companySize,
          website: form.website,
        }),
      });
      addToast('Organization details updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setIsSavingGeneral(false);
    }
  }, [form, addToast]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('user-content').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-content').getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error('Could not resolve uploaded logo URL');

      await authedFetch('/api/organization/logo', {
        method: 'POST',
        body: JSON.stringify({ logo_url: urlData.publicUrl }),
      });

      setLogoUrl(urlData.publicUrl);
      addToast('Logo updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to upload logo', 'error');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  }, [addToast]);

  const handleSaveColor = useCallback(async () => {
    try {
      await authedFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({ primary_color: form.primaryColor }),
      });
      addToast('Branding updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save branding', 'error');
    }
  }, [form.primaryColor, addToast]);

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
            <Button style={{ marginTop: 24 }} isLoading={isSavingGeneral} onClick={handleSaveGeneral}>
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
            <Button style={{ marginTop: 24 }} onClick={handleSaveColor}>
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
