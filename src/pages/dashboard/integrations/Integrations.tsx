import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ExternalLink, Plus, Key, Copy, Check, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import type { Integration } from '../../../types/dashboard.types';
import styles from './Integrations.module.css';
import { useAuth } from '../../../hooks/useAuth';
import { useEntitlements } from '../../../context/EntitlementsContext';
import {
  useAiProviders,
  useIntegrations,
  usePlatformKeys,
  useCreateIntegration,
  useUpdateIntegration,
  useDisconnectIntegration,
  useCreatePlatformKey,
  useRevokePlatformKey,
  type CreateIntegrationInput,
} from '../../../hooks/queries/usePlatformKeys';

const statusVariant: Record<Integration['status'], 'success' | 'error' | 'neutral'> = {
  active: 'success',
  error: 'error',
  inactive: 'neutral',
};

// Colors for providers not in the DB with a custom color
function getColor(name: string, dynamicProviders: any[]): string {
  const provider = dynamicProviders.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return provider?.color ?? '#22c55e';
}

export function Integrations() {
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(null);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  // Base URL only used for custom / OpenAI-compatible providers
  const [baseUrl, setBaseUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Key management: which integration's "Manage Keys" modal is open
  const [keysModalIntegration, setKeysModalIntegration] = useState<{ id: string; name: string } | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // One-time reveal screen — shown right after a key is generated, then
  // never again. Cleared as soon as the modal is dismissed.
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Disconnect confirmation — separate from the plain window.confirm() used
  // before, because we now need to show a dynamic warning about how many
  // active platform keys will be revoked.
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; activeKeyCount: number } | null>(null);

  // Provider picker: shown when the top-right "Connect Provider" button is clicked
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const { user } = useAuth();
  const authReady = !!user?.id;
  const { limits, isAtLimit } = useEntitlements();

  // ---- Server state via React Query --------------------------------------
  const { data: allProviders = [] } = useAiProviders(authReady);
  const { data: connected = [] } = useIntegrations(authReady);
  const { data: platformKeys = [], isLoading: keysLoading } = usePlatformKeys(keysModalIntegration?.id);

  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const createPlatformKey = useCreatePlatformKey();
  const revokePlatformKey = useRevokePlatformKey();

  const saving = createIntegration.isPending || updateIntegration.isPending;
  const disconnectingId = disconnectIntegration.isPending
    ? (disconnectIntegration.variables as string | undefined) ?? null
    : null;
  const isCreatingKey = createPlatformKey.isPending;

  const available = useMemo(
    () => allProviders.filter((p) => !connected.find((c) => c.provider.toLowerCase() === p.id.toLowerCase())),
    [allProviders, connected],
  );

  const handleDisconnectClick = (integrationId: string) => {
    const integration = connected.find((item) => item.id === integrationId);
    setDisconnectTarget({ id: integrationId, activeKeyCount: integration?.activePlatformKeys ?? 0 });
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      await disconnectIntegration.mutateAsync(disconnectTarget.id);
      setDisconnectTarget(null);
    } catch (err) {
      console.error('[Integrations] Disconnect failed:', err);
    }
  };

  const handleOpenModal = (provider: { id: string; name: string }) => {
    setEditingIntegrationId(null);
    setSelectedProvider(provider);
    setApiKey('');
    setDisplayName('');
    setBaseUrl('');
    setShowPassword(false);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingIntegrationId(item.id);
    const providerMeta = allProviders.find((p) => p.id.toLowerCase() === item.provider.toLowerCase());
    setSelectedProvider({ id: item.provider, name: providerMeta?.name ?? item.provider });
    setDisplayName(item.displayName);
    // Intentionally left blank: the decrypted key is never sent to the
    // frontend. If the user leaves this blank and saves, the existing
    // encrypted key on the server is left untouched.
    setApiKey('');
    setShowPassword(false);
  };

  const handleOpenKeysModal = (integration: { id: string; name: string }) => {
    // Opening the modal enables the `usePlatformKeys` query (keyed on the
    // integration id), which fetches on demand.
    setKeysModalIntegration(integration);
    setRevealedKey(null);
    setNewKeyName('');
  };

  const handleCreateKey = async () => {
    if (!keysModalIntegration || !newKeyName.trim()) return;

    try {
      const created = await createPlatformKey.mutateAsync({
        integrationId: keysModalIntegration.id,
        name: newKeyName.trim(),
      });
      // Show the one-time reveal screen — this is the only place the plain
      // key will ever appear. It is never logged or cached.
      setRevealedKey(created.plainKey);
      setNewKeyName('');
    } catch (err) {
      console.error('Failed to create platform key', err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      await revokePlatformKey.mutateAsync(keyId);
    } catch (err) {
      console.error('Failed to revoke platform key', err);
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleCopyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseKeysModal = () => {
    setKeysModalIntegration(null);
    setRevealedKey(null);
    setCopied(false);
  };

  const handleSaveModal = async () => {
    try {
      const isEditing = editingIntegrationId !== null;

      if (isEditing) {
        // Editing: only send api_key if the user actually typed a new one.
        // Leaving it blank keeps the existing encrypted key untouched.
        await updateIntegration.mutateAsync({
          id: editingIntegrationId!,
          display_name: displayName,
          ...(apiKey ? { api_key: apiKey } : {}),
        });
        setSelectedProvider(null);
        setEditingIntegrationId(null);
      } else {
        // organization_id is resolved server-side — do not send it from the frontend
        const payload: CreateIntegrationInput = {
          provider: selectedProvider?.id,
          display_name: displayName,
          api_key: apiKey,
        };
        // Custom / OpenAI-compatible providers require a base URL, sent as metadata
        if (selectedProvider?.id === 'custom') {
          payload.metadata = { base_url: baseUrl.trim() };
        }
        await createIntegration.mutateAsync(payload);
        setSelectedProvider(null);
      }
    } catch (err) {
      console.error('[Integrations] Save failed:', err);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>AI Integrations</h1>
        {isAtLimit('integrations', connected.length) ? (
          <Link to="/dashboard/settings" style={{ textDecoration: 'none' }}>
            <Badge variant="error">
              Upgrade to add more integrations (Limit: {limits.limits.integrations ?? '∞'})
            </Badge>
          </Link>
        ) : (
          <Button onClick={() => setShowProviderPicker(true)}>
            <Plus size={16} />
            Connect Provider
          </Button>
        )}
      </div>

      {connected.length > 0 ? (
        <>
          <h2 className={styles.sectionTitle}>Connected Integrations</h2>
          <div className={styles.grid2}>
            {connected.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div
                    className={styles.providerDot}
                    style={{ background: getColor(item.provider, allProviders) }}
                  >
                    {item.provider.charAt(0)}
                  </div>
                  <div>
                    <div className={styles.providerName}>{item.provider}</div>
                    <div className={styles.displayName}>{item.displayName}</div>
                  </div>
                </div>
                <Badge variant={statusVariant[item.status as Integration['status']]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Badge>
                <div className={styles.detail}>Last synced: {item.lastSync}</div>
                <div className={styles.detail}>
                  Total: ${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {item.activePlatformKeys > 0 && (
                  <div className={styles.detail}>
                    <Key size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {item.activePlatformKeys} active API key{item.activePlatformKeys === 1 ? '' : 's'}
                  </div>
                )}
                <div className={styles.cardActions}>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(item)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenKeysModal({ id: item.id, name: item.displayName })}
                  >
                    <Key size={14} />
                    {item.activePlatformKeys > 0 ? 'Manage Keys' : 'Activate for External Use'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnectClick(item.id)}
                    disabled={disconnectingId === item.id}
                  >
                    {disconnectingId === item.id ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No integrations connected
        </div>
      )}

      <h2 className={styles.sectionTitle}>Available Providers</h2>
      <div className={styles.grid3}>
        {available.map((provider) => (
          <div key={provider.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div
                className={styles.providerDot}
                style={{ background: provider.color }}
              >
                {provider.name.charAt(0)}
              </div>
              <div className={styles.providerName}>{provider.name}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => handleOpenModal({ id: provider.id, name: provider.name })}
            >
              Connect
            </Button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={selectedProvider !== null}
        onClose={() => {
          setSelectedProvider(null);
          setEditingIntegrationId(null);
        }}
        title={editingIntegrationId ? `Edit ${selectedProvider?.name ?? ''}` : `Connect ${selectedProvider?.name ?? ''}`}
        slidePanel
      >
        <div className={styles.modalForm}>
          <div className={styles.apiInput}>
            <Input
              label={editingIntegrationId ? 'API Key (leave blank to keep current key)' : 'API Key'}
              type={showPassword ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={editingIntegrationId ? 'Enter a new key only to replace it' : 'sk-...'}
            />
            <button
              type="button"
              className={styles.showToggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide API key' : 'Show API key'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {selectedProvider?.id === 'custom' && !editingIntegrationId && (
            <Input
              label="Base URL"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.your-provider.com/v1"
            />
          )}
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My API Key"
          />
          <a
            href="#"
            className={styles.instructionsLink}
          >
            <ExternalLink size={14} />
            View setup instructions
          </a>
          <Button
            fullWidth
            onClick={handleSaveModal}
            disabled={
              saving ||
              (selectedProvider?.id === 'custom' && !editingIntegrationId && !baseUrl.trim())
            }
          >
            {editingIntegrationId ? 'Save Changes' : 'Save & Connect'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={keysModalIntegration !== null}
        onClose={handleCloseKeysModal}
        title={`API Keys — ${keysModalIntegration?.name ?? ''}`}
        slidePanel
      >
        <div className={styles.modalForm}>
          {revealedKey ? (
            <>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                Copy this key now — for your security, it won't be shown again.
              </p>
              <div className={styles.apiInput}>
                <code
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--color-tertiary)',
                    borderRadius: 6,
                    fontSize: 13,
                    wordBreak: 'break-all',
                  }}
                >
                  {revealedKey}
                </code>
                <button
                  type="button"
                  className={styles.showToggle}
                  onClick={handleCopyKey}
                  aria-label="Copy key"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <div style={{ background: 'var(--color-tertiary)', borderRadius: 6, padding: 12, fontSize: 13 }}>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}>Use it from any external code:</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
{`from openai import OpenAI
client = OpenAI(
  api_key="${revealedKey}",
  base_url="<your-api-server-url>/v1"
)
client.chat.completions.create(
  model="your-model-name",
  messages=[{"role": "user", "content": "Hello"}]
)`}
                </pre>
                <div style={{ color: 'var(--color-text-tertiary)', marginTop: 6, fontSize: 11 }}>
                  Replace &lt;your-api-server-url&gt; with the backend's address (e.g. http://localhost:3001 in development).
                </div>
              </div>
              <Button fullWidth onClick={handleCloseKeysModal}>
                Done
              </Button>
            </>
          ) : (
            <>
              <div className={styles.apiInput}>
                <Input
                  label="New Key Name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Server"
                  disabled={isAtLimit('platform_keys', platformKeys.filter(k => k.isActive).length)}
                />
              </div>
              {isAtLimit('platform_keys', platformKeys.filter(k => k.isActive).length) ? (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Link to="/dashboard/settings" style={{ textDecoration: 'none' }}>
                    <Badge variant="error">Upgrade to generate more platform keys (Limit: {limits.limits.platform_keys ?? '∞'})</Badge>
                  </Link>
                </div>
              ) : (
                <Button fullWidth onClick={handleCreateKey} isLoading={isCreatingKey} loadingText="Generating…" disabled={!newKeyName.trim()}>
                  <Plus size={16} />
                  Generate New Key
                </Button>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 12 }}>
                {keysLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '1rem 0' }}>
                    Loading keys...
                  </div>
                ) : platformKeys.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem 0' }}>
                    No keys yet for this integration
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {platformKeys.map((key) => (
                      <div
                        key={key.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'var(--color-tertiary)',
                          borderRadius: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text-primary)' }}>
                            {key.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            {key.keyPreview} · {key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                          </div>
                        </div>
                        {key.isActive ? (
                          <button
                            className={styles.showToggle}
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={revokingKeyId === key.id}
                            aria-label={`Revoke ${key.name}`}
                            title="Revoke this key"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <Badge variant="neutral">Revoked</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={disconnectTarget !== null}
        onClose={() => setDisconnectTarget(null)}
        title="Disconnect Integration"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            {disconnectTarget && disconnectTarget.activeKeyCount > 0 ? (
              <>
                This integration has <strong>{disconnectTarget.activeKeyCount} active API key{disconnectTarget.activeKeyCount === 1 ? '' : 's'}</strong>{' '}
                linked to it. Disconnecting will also revoke {disconnectTarget.activeKeyCount === 1 ? 'that key' : 'those keys'} — any
                external code using {disconnectTarget.activeKeyCount === 1 ? 'it' : 'them'} will stop working immediately.
              </>
            ) : (
              "Disconnect this integration? This can't be undone."
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDisconnectTarget(null)} disabled={disconnectIntegration.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDisconnect}
              isLoading={disconnectIntegration.isPending}
              loadingText="Disconnecting…"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>
      {/* PROVIDER PICKER MODAL — opens when the top-right button is clicked */}
      <Modal
        isOpen={showProviderPicker}
        onClose={() => setShowProviderPicker(false)}
        title="Select a Provider to Connect"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {allProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                setShowProviderPicker(false);
                handleOpenModal({ id: provider.id, name: provider.name });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--color-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms ease, border-color 120ms ease',
                opacity: connected.find(c => c.provider.toLowerCase() === provider.id.toLowerCase()) ? 0.4 : 1,
              }}
              disabled={!!connected.find(c => c.provider.toLowerCase() === provider.id.toLowerCase())}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: provider.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {provider.name.charAt(0)}
              </span>
              <span style={{ flex: 1 }}>{provider.name}</span>
              {connected.find(c => c.provider.toLowerCase() === provider.id.toLowerCase()) && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Connected</span>
              )}
            </button>
          ))}

          {/* Custom / OpenAI-compatible provider — not in the ai_providers
              table, so it's offered as a dedicated static option here. */}
          <button
            key="custom"
            onClick={() => {
              setShowProviderPicker(false);
              handleOpenModal({ id: 'custom', name: 'Custom Provider' });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--color-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              +
            </span>
            <span style={{ flex: 1 }}>
              Custom Provider
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>
                OpenAI-compatible
              </span>
            </span>
          </button>
        </div>
      </Modal>

    </div>
  );
}
