import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Card } from '../../../components/ui/Card/Card';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast/Toast';
import { supabase } from '../../../lib/supabase';
import { uploadAvatar } from '../../../services/users';
import styles from './Profile.module.css';

const timezones = [
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Denver', label: 'America/Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZDT)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface ProfileFormState {
  fullName: string;
  jobTitle: string;
  phone: string;
  timezone: string;
  language: string;
}

function SearchableSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div ref={ref} className={styles.selectWrap}>
        <button
          type="button"
          className={styles.select}
          onClick={() => setOpen(!open)}
        >
          <span>{selected ? selected.label : 'Select...'}</span>
          <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className={styles.dropdown}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className={styles.options}>
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.option} ${opt.value === value ? styles.optionActive : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <span className={styles.noOptions}>No options found</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

export function Profile() {
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');

  const [form, setForm] = useState<ProfileFormState>({
    fullName: '', jobTitle: '', phone: '', timezone: '', language: 'en',
  });
  const [initialForm, setInitialForm] = useState<ProfileFormState>(form);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  // Change email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Note: no password change UI — platform is Google OAuth only, there's
  // no password-based sign-in for a changed password to be used with.

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await authedFetch('/api/profile');
      const u = data.user;
      const loaded: ProfileFormState = {
        fullName: u.full_name ?? '',
        jobTitle: u.job_title ?? '',
        phone: u.phone_number ?? '',
        timezone: u.timezone ?? '',
        language: u.language ?? 'en',
      };
      setForm(loaded);
      setInitialForm(loaded);
      setAvatarUrl(u.avatar_url ?? undefined);
      setEmail(u.email ?? '');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load profile', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Warn on browser navigation/refresh with unsaved changes
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      addToast('File size must be less than 2MB', 'error');
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { url, error } = await uploadAvatar(user.id, file);
      if (error || !url) throw new Error(error || 'Upload failed');
      setAvatarUrl(url);
      addToast('Profile photo updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  }, [user, addToast]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await authedFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: form.fullName,
          job_title: form.jobTitle,
          phone_number: form.phone,
          timezone: form.timezone,
          language: form.language,
        }),
      });
      setInitialForm(form);
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [form, addToast]);

  const handleCancel = useCallback(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleChangeEmail = useCallback(async () => {
    if (!newEmail) return;
    setIsChangingEmail(true);
    try {
      const { data } = await authedFetch('/api/profile/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
      });
      addToast(data.message || 'Verification email sent', 'success');
      setEmailModalOpen(false);
      setNewEmail('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to change email', 'error');
    } finally {
      setIsChangingEmail(false);
    }
  }, [newEmail, addToast]);

  const canDelete = deleteConfirm === 'DELETE';

  const handleDeleteAccount = useCallback(async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await authedFetch('/api/profile', { method: 'DELETE' });
      addToast('Account deleted', 'success');
      await signOut();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
      setIsDeleting(false);
    }
  }, [canDelete, addToast, signOut]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div style={{ marginBottom: 32 }}>
          <Skeleton height="32px" width="220px" />
        </div>
        <Card>
          <Skeleton height="200px" />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 style={{ fontSize: 24, fontWeight: 'var(--fw-extrabold)' as string, marginBottom: 32 }}>
        Profile Settings
      </h1>

      <Card>
        <h2 className={styles.sectionTitle}>Personal Information</h2>

        <div className={styles.avatarWrap}>
          <div className={styles.avatarUpload} onClick={handleAvatarClick}>
            <Avatar src={avatarUrl} name={form.fullName || 'User'} size="xl" />
            <div className={styles.avatarOverlay}>
              <span>{isUploadingAvatar ? '...' : 'Change'}</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div>
            <div className={styles.avatarName}>{form.fullName || 'Your Name'}</div>
            <div className={styles.avatarHint}>JPG or PNG. Max 2MB.</div>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Enter your full name"
          />
          <Input
            label="Job Title"
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            placeholder="e.g. AI Engineer"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Work Email</span>
          <div className={styles.readonlyRow}>
            <span className={styles.readonlyValue}>{email || '—'}</span>
            <button type="button" className={styles.changeLink} onClick={() => setEmailModalOpen(true)}>
              Change email
            </button>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
          />
          <SearchableSelect
            label="Timezone"
            value={form.timezone}
            options={timezones}
            onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
          />
        </div>

        <div className={styles.formGrid} style={{ marginTop: 0 }}>
          <SearchableSelect
            label="Language"
            value={form.language}
            options={languages}
            onChange={(v) => setForm((f) => ({ ...f, language: v }))}
          />
          <div />
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button variant="primary" isLoading={isSaving} disabled={!isDirty} onClick={handleSave}>
            Save Changes
          </Button>
          {isDirty && (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                You have unsaved changes
              </span>
            </>
          )}
        </div>
      </Card>

      <div>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <div className={styles.dangerCard}>
          <h3 className={styles.dangerTitle}>Delete Account</h3>
          <p className={styles.dangerText}>
            Once you delete your account, there is no going back. Please be certain.
            This action will permanently remove all of your data, including projects,
            API keys, billing information, and team memberships. We recommend
            downloading any data you need before proceeding.
          </p>
          <input
            type="text"
            className={styles.dangerInput}
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <Button variant="danger" disabled={!canDelete} isLoading={isDeleting} onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </div>
      </div>

      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Change Email" size="small">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            We'll send a verification link to the new address. Your email won't change until you confirm it.
          </p>
          <Input
            label="New Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button variant="primary" isLoading={isChangingEmail} onClick={handleChangeEmail} disabled={!newEmail}>
            Send Verification Email
          </Button>
        </div>
      </Modal>
    </div>
  );
}
