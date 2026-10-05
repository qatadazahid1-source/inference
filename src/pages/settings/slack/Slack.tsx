import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MessageSquare, Zap, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { useToast } from '../../../components/ui/Toast/Toast';
import { useEntitlements } from '../../../context/EntitlementsContext';
import {
  useSlackIntegration,
  useSlackChannels,
  useSlackOAuthInit,
  useSaveSlackChannel,
  useTestSlackMessage,
  useDisconnectSlack,
} from '../../../hooks/queries/useSlack';
import styles from './Slack.module.css';

export function SlackSettings() {
  const { hasFeature } = useEntitlements();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detect OAuth redirect result from query params
  const slackConnected = searchParams.get('slack_connected') === 'true';
  const slackError = searchParams.get('slack_error');

  // Clear query params after reading them (one-time)
  useEffect(() => {
    if (slackConnected || slackError) {
      setSearchParams({}, { replace: true });
      if (slackConnected) {
        addToast('Slack workspace connected! Select a channel below.', 'success');
      }
      if (slackError) {
        addToast(`Slack connection failed: ${slackError.replace(/_/g, ' ')}`, 'error');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSlack = hasFeature('slack_alerts');

  // Queries
  const integrationQuery = useSlackIntegration(hasSlack);
  const integration = integrationQuery.data;
  const isLoading = integrationQuery.isLoading;
  const fetchError = integrationQuery.error as { status?: number; message?: string } | null;

  // Show channel picker when connected but no channel yet selected
  const needsChannel = !!integration && !integration.is_active;
  const channelsQuery = useSlackChannels(needsChannel);
  const channels = channelsQuery.data ?? [];

  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedChannelName, setSelectedChannelName] = useState('');

  // Mutations
  const oauthInit = useSlackOAuthInit();
  const saveChannel = useSaveSlackChannel();
  const testMessage = useTestSlackMessage();
  const disconnect = useDisconnectSlack();

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleConnect() {
    oauthInit.mutate(undefined, {
      onError: (err) => addToast(err.message || 'Failed to start Slack connection', 'error'),
    });
  }

  function handleChannelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const found = channels.find((c) => c.id === id);
    setSelectedChannelId(id);
    setSelectedChannelName(found ? `#${found.name}` : '');
  }

  function handleSaveChannel() {
    if (!selectedChannelId) return;
    saveChannel.mutate(
      { channel_id: selectedChannelId, channel_name: selectedChannelName },
      {
        onSuccess: () => addToast(`Channel ${selectedChannelName} saved.`, 'success'),
        onError: (err) => addToast(err.message || 'Failed to save channel', 'error'),
      },
    );
  }

  function handleTest() {
    testMessage.mutate(undefined, {
      onSuccess: (res) => addToast(res.message || 'Test message sent!', 'success'),
      onError: (err) => addToast(err.message || 'Test message failed', 'error'),
    });
  }

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => addToast('Slack disconnected.', 'success'),
      onError: (err) => addToast(err.message || 'Failed to disconnect Slack', 'error'),
    });
  }

  // ── Render: plan gate ─────────────────────────────────────────────────────

  if (!hasSlack) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Slack Alerts</h1>
        <p className={styles.subtext}>
          Get real-time budget and anomaly alerts delivered directly to your Slack workspace.
        </p>
        <div className={styles.upgradeCard}>
          <div className={styles.upgradeIcon}>⚡</div>
          <div>
            <div className={styles.upgradeTitle}>Upgrade to enable Slack Alerts</div>
            <p className={styles.upgradeText}>
              Slack Alerts are available on the Pro plan and above. Connect your workspace to
              receive instant notifications when budgets are exceeded or anomalies are detected.
            </p>
            <Link to="/settings/billing">
              <Button size="sm">View Plans</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: loading ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Slack Alerts</h1>
        <div className={styles.skeletonCard}>
          <Skeleton height="18px" width="200px" />
          <div style={{ marginTop: 16 }}><Skeleton height="14px" width="320px" /></div>
          <div style={{ marginTop: 20 }}><Skeleton height="38px" width="160px" /></div>
        </div>
      </div>
    );
  }

  // ── Render: fetch error (non-403) ─────────────────────────────────────────

  if (fetchError && fetchError.status !== 403) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Slack Alerts</h1>
        <div className={styles.errorBox}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Failed to load Slack status: {fetchError.message ?? 'Unknown error'}. Please refresh the page.</span>
        </div>
      </div>
    );
  }

  // ── Render: disconnected ──────────────────────────────────────────────────

  if (!integration) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Slack Alerts</h1>
        <p className={styles.subtext}>
          Connect your Slack workspace to receive real-time budget and anomaly alerts.
        </p>

        <div className={styles.card}>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${styles.statusDotDisconnected}`} />
            <span className={styles.statusLabel}>Not connected</span>
          </div>

          <div className={styles.cardDesc}>
            Click the button below to authorize Ordisum to post messages to your Slack workspace.
            You will choose which channel to use after connecting.
          </div>

          <div className={styles.cardDesc} style={{ marginBottom: 8 }}>
            <strong>Required Slack permissions:</strong>
            <ul className={styles.scopeList}>
              {['chat:write', 'chat:write.public', 'channels:read', 'groups:read'].map((s) => (
                <li key={s} className={styles.scope}>{s}</li>
              ))}
            </ul>
          </div>

          <div className={styles.actionRow} style={{ marginTop: 20 }}>
            <Button
              onClick={handleConnect}
              isLoading={oauthInit.isPending}
              loadingText="Redirecting to Slack…"
            >
              <MessageSquare size={16} />
              Connect Slack Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: connected but channel not yet selected ────────────────────────

  if (needsChannel) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Slack Alerts</h1>
        <p className={styles.subtext}>
          Workspace connected. Select the channel where alerts should be posted.
        </p>

        <div className={styles.card}>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${styles.statusDotPending}`} />
            <span className={styles.statusLabel}>
              Connected to <strong>{integration.workspace_name ?? 'your workspace'}</strong> — channel not yet set
            </span>
          </div>

          {channelsQuery.isLoading && (
            <div style={{ marginBottom: 16 }}><Skeleton height="38px" width="100%" /></div>
          )}

          {channelsQuery.error && (
            <div className={styles.errorBox}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Could not load channels. Make sure the bot has been added to at least one channel, then refresh.</span>
            </div>
          )}

          {!channelsQuery.isLoading && channels.length > 0 && (
            <div className={styles.channelPicker}>
              <label className={styles.channelPickerLabel} htmlFor="slack-channel-select">
                Select a channel
              </label>
              <select
                id="slack-channel-select"
                className={styles.select}
                value={selectedChannelId}
                onChange={handleChannelChange}
              >
                <option value="">— Choose a channel —</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.is_private ? '🔒' : '#'} {ch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actionRow}>
            <Button
              onClick={handleSaveChannel}
              disabled={!selectedChannelId || saveChannel.isPending}
              isLoading={saveChannel.isPending}
              loadingText="Saving…"
            >
              Save Channel
            </Button>
            <Button variant="ghost" onClick={handleDisconnect} isLoading={disconnect.isPending}>
              <Trash2 size={14} />
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: fully connected and active ────────────────────────────────────

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Slack Alerts</h1>
      <p className={styles.subtext}>
        Slack is connected. Budget and anomaly alerts will be posted to your selected channel.
        Configure which alerts to send in{' '}
        <Link to="/settings/notifications" style={{ color: 'var(--color-signal)' }}>
          Notification Preferences
        </Link>
        .
      </p>

      <div className={styles.card}>
        <div className={styles.statusRow}>
          <CheckCircle2 size={18} color="#22c55e" />
          <span className={styles.statusLabel} style={{ color: '#22c55e' }}>
            Connected &amp; Active
          </span>
        </div>

        <div className={styles.metaGrid}>
          {integration.workspace_name && (
            <div className={styles.metaItem}>
              <div className={styles.metaKey}>Workspace</div>
              <div className={styles.metaValue}>{integration.workspace_name}</div>
            </div>
          )}
          {integration.channel_name && (
            <div className={styles.metaItem}>
              <div className={styles.metaKey}>Channel</div>
              <div className={styles.metaValue}>{integration.channel_name}</div>
            </div>
          )}
          {integration.team_id && (
            <div className={styles.metaItem}>
              <div className={styles.metaKey}>Team ID</div>
              <div className={styles.metaValue} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {integration.team_id}
              </div>
            </div>
          )}
          <div className={styles.metaItem}>
            <div className={styles.metaKey}>Connected since</div>
            <div className={styles.metaValue}>
              {new Date(integration.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className={styles.actionRow}>
          <Button
            onClick={handleTest}
            isLoading={testMessage.isPending}
            loadingText="Sending…"
            variant="secondary"
          >
            <Zap size={14} />
            Send Test Message
          </Button>
          <Button
            variant="ghost"
            onClick={handleConnect}
            isLoading={oauthInit.isPending}
            loadingText="Redirecting…"
          >
            <RefreshCw size={14} />
            Reconnect
          </Button>
          <Button
            variant="danger"
            onClick={handleDisconnect}
            isLoading={disconnect.isPending}
            loadingText="Disconnecting…"
          >
            <Trash2 size={14} />
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
