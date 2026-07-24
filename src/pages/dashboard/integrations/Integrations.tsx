import { useState, useMemo, useEffect } from 'react';
import { Eye, EyeOff, ExternalLink, Plus, Key, Copy, Check, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/Badge/Badge';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Input } from '../../../components/ui/Input/Input';
import type { Integration } from '../../../types/dashboard.types';
import { DashboardService, PlatformKeyData } from '../../../api/services/dashboard.service';
import styles from './Integrations.module.css';
import { supabase } from '../../../services/supabase';

const statusVariant: Record<Integration['status'], 'success' | 'error' | 'neutral'> = {
  active: 'success',
  error: 'error',
  inactive: 'neutral',
};

const availableProviders: Array<{ id: string; name: string; color: string; connected: boolean }> = [
  { id: 'openai', name: 'OpenAI', color: '#74aa9c', connected: false },
  { id: 'anthropic', name: 'Anthropic', color: '#d4a574', connected: false },
  { id: 'google', name: 'Google AI', color: '#8ab4f8', connected: false },
  { id: 'azure', name: 'Azure OpenAI', color: '#7fba00', connected: false },
  { id: 'cohere', name: 'Cohere', color: '#d18ee2', connected: false },
  { id: 'mistral', name: 'Mistral AI', color: '#f97316', connected: false },
  { id: 'bedrock', name: 'AWS Bedrock', color: '#ff9900', connected: false },
  { id: 'groq', name: 'Groq', color: '#22c55e', connected: false },
];

const providerColorMap: Record<string, string> = {};
availableProviders.forEach((p) => {
  providerColorMap[p.name.toLowerCase()] = p.color;
});

function getColor(name: string): string {
  return providerColorMap[name.toLowerCase()] ?? '#22c55e';
}

export function Integrations() {
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string } | null>(null);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connected, setConnected] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Key management: which integration's "Manage Keys" modal is open
  const [keysModalIntegration, setKeysModalIntegration] = useState<{ id: string; name: string } | null>(null);
  const [platformKeys, setPlatformKeys] = useState<PlatformKeyData[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // One-time reveal screen — shown right after a key is generated, then
  // never again. Cleared as soon as the modal is dismissed.
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Disconnect confirmation — separate from the plain window.confirm() used
  // before, because we now need to show a dynamic warning about how many
  // active platform keys will be revoked.
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; activeKeyCount: number } | null>(null);

  const fetchIntegrations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // org_id is resolved server-side from the authenticated user
      const res = await fetch('/api/api-keys', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.data) {
        setConnected(json.data.map((item: any) => ({
          id: item.id,
          provider: item.provider,
          displayName: item.display_name,
          status: item.status,
          lastSync: item.last_sync_at ? new Date(item.last_sync_at).toLocaleDateString() : 'Never',
          totalCost: 0,
          activePlatformKeys: item.active_platform_keys ?? 0,
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const available = useMemo(
    () => availableProviders.filter((p) => !connected.find(c => c.provider.toLowerCase() === p.id.toLowerCase())),
    [connected],
  );

  const handleDisconnectClick = (integrationId: string) => {
    const integration = connected.find((item) => item.id === integrationId);
    setDisconnectTarget({ id: integrationId, activeKeyCount: integration?.activePlatformKeys ?? 0 });
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectTarget) return;
    const integrationId = disconnectTarget.id;

    try {
      setDisconnectingId(integrationId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/api-keys/${integrationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        // Remove it from local state immediately so the UI updates without
        // waiting on a refetch, then refetch in the background to stay in sync.
        setConnected((prev) => prev.filter((item) => item.id !== integrationId));
        setDisconnectTarget(null);
        fetchIntegrations();
      } else {
        const err = await res.json();
        console.error('[Integrations] Disconnect failed:', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleOpenModal = (provider: { id: string; name: string }) => {
    setEditingIntegrationId(null);
    setSelectedProvider(provider);
    setApiKey('');
    setDisplayName('');
    setShowPassword(false);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingIntegrationId(item.id);
    const providerMeta = availableProviders.find((p) => p.id.toLowerCase() === item.provider.toLowerCase());
    setSelectedProvider({ id: item.provider, name: providerMeta?.name ?? item.provider });
    setDisplayName(item.displayName);
    // Intentionally left blank: the decrypted key is never sent to the
    // frontend. If the user leaves this blank and saves, the existing
    // encrypted key on the server is left untouched.
    setApiKey('');
    setShowPassword(false);
  };

  const handleOpenKeysModal = async (integration: { id: string; name: string }) => {
    setKeysModalIntegration(integration);
    setRevealedKey(null);
    setNewKeyName('');
    setKeysLoading(true);
    try {
      const keys = await DashboardService.getPlatformKeys(integration.id);
      setPlatformKeys(keys);
    } catch (err) {
      console.error('Failed to fetch platform keys', err);
    } finally {
      setKeysLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keysModalIntegration || !newKeyName.trim()) return;

    setIsCreatingKey(true);
    try {
      const created = await DashboardService.createPlatformKey(keysModalIntegration.id, newKeyName.trim());
      setPlatformKeys((prev) => [created, ...prev]);
      // Show the one-time reveal screen — this is the only place the plain
      // key will ever appear.
      setRevealedKey(created.plainKey);
      setNewKeyName('');
      // Refresh the integration list in the background so the card's
      // active-key count badge updates too.
      fetchIntegrations();
    } catch (err) {
      console.error('Failed to create platform key', err);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      await DashboardService.revokePlatformKey(keyId);
      setPlatformKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, isActive: false } : k)));
      fetchIntegrations();
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
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isEditing = editingIntegrationId !== null;

      if (isEditing) {
        // Editing: only send api_key if the user actually typed a new one.
        // Leaving it blank keeps the existing encrypted key untouched.
        const body: Record<string, string> = { display_name: displayName };
        if (apiKey) {
          body.api_key = apiKey;
        }

        const res = await fetch(`/api/api-keys/${editingIntegrationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          setSelectedProvider(null);
          setEditingIntegrationId(null);
          fetchIntegrations();
        } else {
          const err = await res.json();
          console.error('[Integrations] Update failed:', err);
        }
      } else {
        // organization_id is resolved server-side — do not send it from the frontend
        const res = await fetch('/api/api-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            provider: selectedProvider?.id,
            display_name: displayName,
            api_key: apiKey
          })
        });

        if (res.ok) {
          setSelectedProvider(null);
          fetchIntegrations();
        } else {
          const err = await res.json();
          console.error('[Integrations] Save failed:', err);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>AI Integrations</h1>
        <Button onClick={() => {}}>
          <Plus size={16} />
          Connect Provider
        </Button>
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
                    style={{ background: getColor(item.provider) }}
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
          <Button fullWidth onClick={handleSaveModal} disabled={loading}>
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
                />
              </div>
              <Button fullWidth onClick={handleCreateKey} isLoading={isCreatingKey} loadingText="Generating…" disabled={!newKeyName.trim()}>
                <Plus size={16} />
                Generate New Key
              </Button>

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
            <Button variant="ghost" onClick={() => setDisconnectTarget(null)} disabled={disconnectingId !== null}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDisconnect}
              isLoading={disconnectingId !== null}
              loadingText="Disconnecting…"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
