import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import axiosClient from '../../../lib/axios';
import styles from './SubmissionModals.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionModalMode = 'none' | 'choose' | 'provider' | 'model';

interface PricingComponent {
  component_type: string;
  unit: 'per_1k' | 'per_1m';
  price_per_unit: string;
}

const COMPONENT_TYPES = [
  { value: 'input_tokens',     label: 'Input Tokens' },
  { value: 'output_tokens',    label: 'Output Tokens' },
  { value: 'cached_input',     label: 'Cached Input Tokens' },
  { value: 'cache_write',      label: 'Cache Write Tokens' },
  { value: 'image_generation', label: 'Image Generation' },
  { value: 'audio_input',      label: 'Audio Input' },
  { value: 'audio_output',     label: 'Audio Output' },
  { value: 'web_search',       label: 'Web Search / Tool Call' },
  { value: 'other',            label: 'Other' },
];

const PROTOCOLS = [
  { value: 'openai_compatible', label: 'OpenAI-compatible REST' },
  { value: 'anthropic',         label: 'Anthropic Messages API' },
  { value: 'google',            label: 'Google AI / Vertex' },
  { value: 'custom',            label: 'Custom / Proprietary' },
  { value: 'other',             label: 'Other / Unknown' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err?.data?.error === 'string') return err.data.error;
  if (typeof err?.response?.data?.error === 'string') return err.response.data.error;
  if (typeof err?.data?.message === 'string') return err.data.message;
  if (typeof err?.response?.data?.message === 'string') return err.response.data.message;
  if (typeof err?.message === 'string' && err.message) return err.message;
  return fallback;
}

function normalizedPreview(price: string, unit: 'per_1k' | 'per_1m'): string {
  const p = parseFloat(price);
  if (!isFinite(p) || price === '') return '—';
  const per1k = unit === 'per_1m' ? p / 1000 : p;
  return `$${per1k.toFixed(6)} / 1K tokens`;
}

// ─── Choose-type modal (Provider vs Model) ────────────────────────────────────

interface ChooseSubmissionTypeProps {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (type: 'provider' | 'model') => void;
}

export function ChooseSubmissionTypeModal({ isOpen, onClose, onChoose }: ChooseSubmissionTypeProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What would you like to add?" size="small">
      <div className={styles.chooseGrid}>
        <button className={styles.chooseCard} onClick={() => onChoose('provider')}>
          <span className={styles.chooseIcon}>🏢</span>
          <strong>Add Provider</strong>
          <span className={styles.chooseDesc}>
            Submit a new AI provider (company/platform) not yet in the catalog.
          </span>
        </button>
        <button className={styles.chooseCard} onClick={() => onChoose('model')}>
          <span className={styles.chooseIcon}>🤖</span>
          <strong>Add Model</strong>
          <span className={styles.chooseDesc}>
            Submit a specific model with pricing components for admin review.
          </span>
        </button>
      </div>
    </Modal>
  );
}

// ─── Add Provider Modal ───────────────────────────────────────────────────────

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProviderModal({ isOpen, onClose, onSuccess }: AddProviderModalProps) {
  const [form, setForm] = useState({
    name: '', provider_id: '', website_url: '', docs_url: '',
    base_url: '', protocol: 'openai_compatible', notes: '',
  });
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // Auto-generate slug from name
  const handleNameChange = (v: string) => {
    const slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(f => ({ ...f, name: v, provider_id: slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axiosClient.post('/api/submissions/providers', form);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); onClose(); }, 1800);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Submission failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setForm({ name: '', provider_id: '', website_url: '', docs_url: '', base_url: '', protocol: 'openai_compatible', notes: '' }); setError(null); setSuccess(false); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit a New Provider" size="medium">
      {success ? (
        <div className={styles.successState}>
          <CheckCircle size={40} className={styles.successIcon} />
          <h3>Submitted for Review</h3>
          <p>An admin will review your provider submission shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className={styles.formRow}>
            <label className={styles.label}>Provider Name *</label>
            <input
              id="submit-provider-name"
              className={styles.input}
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. DeepMind"
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Provider ID (slug) *
              <span className={styles.hint}> — lowercase, hyphens only, used in API routing</span>
            </label>
            <input
              id="submit-provider-id"
              className={styles.input}
              value={form.provider_id}
              onChange={e => handleChange('provider_id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. deepmind"
              pattern="[a-z0-9-]+"
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Protocol / API Compatibility</label>
            <div className={styles.selectWrapper}>
              <select
                id="submit-provider-protocol"
                className={styles.select}
                value={form.protocol}
                onChange={e => handleChange('protocol', e.target.value)}
              >
                {PROTOCOLS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown size={14} className={styles.selectChevron} />
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Website URL</label>
            <input id="submit-provider-website" className={styles.input} type="url" value={form.website_url}
              onChange={e => handleChange('website_url', e.target.value)} placeholder="https://example.com" />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Docs URL</label>
            <input id="submit-provider-docs" className={styles.input} type="url" value={form.docs_url}
              onChange={e => handleChange('docs_url', e.target.value)} placeholder="https://docs.example.com" />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>API Base URL</label>
            <input id="submit-provider-baseurl" className={styles.input} type="url" value={form.base_url}
              onChange={e => handleChange('base_url', e.target.value)} placeholder="https://api.example.com/v1" />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Notes <span className={styles.hint}>(optional — context for the reviewer)</span></label>
            <textarea id="submit-provider-notes" className={styles.textarea} value={form.notes}
              onChange={e => handleChange('notes', e.target.value)} rows={3}
              placeholder="Any extra context, links, or motivation for adding this provider." />
          </div>

          <div className={styles.formFooter}>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Add Model Modal ──────────────────────────────────────────────────────────

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  knownProviders: string[];
}

export function AddModelModal({ isOpen, onClose, onSuccess, knownProviders }: AddModelModalProps) {
  const [form, setForm] = useState({
    provider: '', model_id: '', display_name: '',
    docs_url: '', context_window: '', notes: '',
  });
  const [components, setComponents] = useState<PricingComponent[]>([
    { component_type: 'input_tokens',  unit: 'per_1m', price_per_unit: '' },
    { component_type: 'output_tokens', unit: 'per_1m', price_per_unit: '' },
  ]);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; body: string }>({
    title: 'Submitted for Review',
    body: 'An admin will review your model submission shortly.',
  });
  const [loading, setLoading] = useState(false);

  const handleField = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const updateComponent = (idx: number, field: keyof PricingComponent, value: string) =>
    setComponents(cs => cs.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const addComponent = () =>
    setComponents(cs => [...cs, { component_type: 'other', unit: 'per_1m', price_per_unit: '' }]);

  const removeComponent = (idx: number) =>
    setComponents(cs => cs.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validComponents = components.filter(c => c.price_per_unit.trim() !== '');
    if (validComponents.length === 0) {
      setError('At least one pricing component with a price is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post<{ auto_approved?: boolean; message?: string }>('/api/submissions/models', {
        ...form,
        context_window: form.context_window ? parseInt(form.context_window, 10) : null,
        pricing_components: validComponents,
      });

      if (res.data?.auto_approved) {
        setSuccessInfo({
          title: 'Added to Benchmarks',
          body: 'This model is verified in the catalog and has been immediately added to your organization\'s benchmarks.',
        });
      } else {
        setSuccessInfo({
          title: 'Submitted for Review',
          body: 'An admin will review your model submission shortly.',
        });
      }

      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); onClose(); }, 2000);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Submission failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ provider: '', model_id: '', display_name: '', docs_url: '', context_window: '', notes: '' });
    setComponents([
      { component_type: 'input_tokens',  unit: 'per_1m', price_per_unit: '' },
      { component_type: 'output_tokens', unit: 'per_1m', price_per_unit: '' },
    ]);
    setError(null); setSuccess(false); onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit a New Model" size="large">
      {success ? (
        <div className={styles.successState}>
          <CheckCircle size={40} className={styles.successIcon} />
          <h3>{successInfo.title}</h3>
          <p>{successInfo.body}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}><AlertCircle size={16} /> {error}</div>}

          <div className={styles.formGrid2}>
            <div className={styles.formRow}>
              <label className={styles.label}>Provider *</label>
              <input
                id="submit-model-provider"
                list="known-providers-list"
                className={styles.input}
                value={form.provider}
                onChange={e => handleField('provider', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. openai"
                required
              />
              <datalist id="known-providers-list">
                {knownProviders.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>
                Exact Model ID *
                <span className={styles.hint}> — upstream API identifier</span>
              </label>
              <input
                id="submit-model-id"
                className={styles.input}
                value={form.model_id}
                onChange={e => handleField('model_id', e.target.value)}
                placeholder="e.g. gpt-4o-2024-11-20"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Display Name *</label>
            <input
              id="submit-model-display-name"
              className={styles.input}
              value={form.display_name}
              onChange={e => handleField('display_name', e.target.value)}
              placeholder="e.g. GPT-4o (Nov 2024)"
              required
            />
          </div>

          <div className={styles.formGrid2}>
            <div className={styles.formRow}>
              <label className={styles.label}>Docs URL</label>
              <input id="submit-model-docs" className={styles.input} type="url" value={form.docs_url}
                onChange={e => handleField('docs_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Context Window (tokens)</label>
              <input id="submit-model-ctx" className={styles.input} type="number" min="1"
                value={form.context_window} onChange={e => handleField('context_window', e.target.value)}
                placeholder="e.g. 128000" />
            </div>
          </div>

          {/* ── Pricing Components ── */}
          <div className={styles.sectionHeader}>
            <span>Pricing Components</span>
            <button type="button" className={styles.addCompBtn} onClick={addComponent}>
              <Plus size={14} /> Add Component
            </button>
          </div>

          <div className={styles.componentsTable}>
            <div className={styles.compHeader}>
              <span>Type</span><span>Price</span><span>Unit</span><span>Per 1K (preview)</span><span></span>
            </div>
            {components.map((comp, idx) => (
              <div key={idx} className={styles.compRow}>
                <div className={styles.selectWrapper} style={{ flex: '1.5' }}>
                  <select
                    id={`submit-comp-type-${idx}`}
                    className={styles.select}
                    value={comp.component_type}
                    onChange={e => updateComponent(idx, 'component_type', e.target.value)}
                  >
                    {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                <input
                  id={`submit-comp-price-${idx}`}
                  className={`${styles.input} ${styles.compPrice}`}
                  type="number"
                  step="any"
                  min="0"
                  value={comp.price_per_unit}
                  onChange={e => updateComponent(idx, 'price_per_unit', e.target.value)}
                  placeholder="0.00"
                />

                <div className={styles.selectWrapper} style={{ flex: '0.8' }}>
                  <select
                    id={`submit-comp-unit-${idx}`}
                    className={styles.select}
                    value={comp.unit}
                    onChange={e => updateComponent(idx, 'unit', e.target.value as 'per_1k' | 'per_1m')}
                  >
                    <option value="per_1m">per 1M tokens</option>
                    <option value="per_1k">per 1K tokens</option>
                  </select>
                  <ChevronDown size={12} className={styles.selectChevron} />
                </div>

                <span className={styles.normPreview}>
                  {normalizedPreview(comp.price_per_unit, comp.unit)}
                </span>

                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeComponent(idx)}
                  disabled={components.length <= 1}
                  aria-label="Remove component"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.formRow} style={{ marginTop: 16 }}>
            <label className={styles.label}>Notes <span className={styles.hint}>(optional)</span></label>
            <textarea id="submit-model-notes" className={styles.textarea} value={form.notes}
              onChange={e => handleField('notes', e.target.value)} rows={2}
              placeholder="Source of pricing data, relevant links, etc." />
          </div>

          <div className={styles.formFooter}>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
