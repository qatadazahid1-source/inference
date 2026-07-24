import { useState, useEffect, useRef } from 'react';
import { Send, ExternalLink, User, Bot } from 'lucide-react';

import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Spinner } from '../../../components/ui/Spinner/Spinner';
import { Badge } from '../../../components/ui/Badge/Badge';
import { supabase } from '../../../services/supabase';
import styles from './Playground.module.css';

interface ConnectedProvider {
  id: string; // integration id
  provider: string;
  displayName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

// Same display-name mapping used on the Integrations page, kept local here
// since there's no shared provider-metadata module yet.
const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  azure: 'Azure OpenAI',
  cohere: 'Cohere',
  mistral: 'Mistral AI',
  bedrock: 'AWS Bedrock',
  groq: 'Groq',
};

export function Playground() {
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [model, setModel] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Fetches the org's active integrations the same way the Integrations
  // page does (GET /api/api-keys), then narrows to status === 'active' so
  // the selector only ever offers providers that can actually serve a
  // request right now.
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/api-keys', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();

        const active = (json.data || [])
          .filter((item: any) => item.status === 'active')
          .map((item: any) => ({
            id: item.id,
            provider: item.provider,
            displayName: item.display_name,
          }));

        setConnectedProviders(active);
        if (active.length > 0) {
          setSelectedIntegrationId(active[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch connected providers', err);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectedProvider = connectedProviders.find((p) => p.id === selectedIntegrationId);
  const hasConnectedProvider = connectedProviders.length > 0;

  const handleSend = async () => {
    if (!userMessage.trim() || !selectedProvider || !model.trim() || isSending) return;

    const outgoingText = userMessage.trim();
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: outgoingText };
    setThread((prev) => [...prev, userMsg]);
    setUserMessage('');
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Build the messages array from the full visible thread so far, plus
      // the optional system message — matches the {provider, model, messages}
      // shape /api/proxy/chat already expects.
      const messages = [
        ...(systemMessage.trim() ? [{ role: 'system', content: systemMessage.trim() }] : []),
        ...thread.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: outgoingText },
      ];

      const res = await fetch('/api/proxy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          provider: selectedProvider.provider,
          model: model.trim(),
          messages,
          integration_id: selectedProvider.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'The request failed.');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: json.data?.text || '(empty response)',
      };
      setThread((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      // Never crash the page on a provider error (rate limit, bad key,
      // etc.) — show it inline in the thread instead.
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err.message || 'Something went wrong talking to the provider.',
        isError: true,
      };
      setThread((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Playground</h1>
      </div>

      {!providersLoading && !hasConnectedProvider && (
        <div className={styles.emptyState}>
          <p>Connect a provider first to start chatting.</p>
          <a href="/dashboard/integrations" className={styles.emptyStateLink}>
            Go to Integrations
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.configPanel}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Provider</label>
            <select
              className={styles.select}
              value={selectedIntegrationId}
              onChange={(e) => setSelectedIntegrationId(e.target.value)}
              disabled={!hasConnectedProvider}
            >
              {connectedProviders.length === 0 && <option value="">No provider connected</option>}
              {connectedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {providerLabels[p.provider.toLowerCase()] ?? p.provider} — {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. llama-3.3-70b-versatile"
            disabled={!hasConnectedProvider}
          />

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>System Message (Optional)</label>
            <textarea
              className={styles.textarea}
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              placeholder="Enter system message (optional)"
              rows={4}
              disabled={!hasConnectedProvider}
            />
          </div>
        </div>

        <div className={styles.chatPanel}>
          <div className={styles.thread}>
            {thread.length === 0 && (
              <div className={styles.threadEmpty}>
                Send a message to start the conversation. Chat history is not saved — it'll clear on reload.
              </div>
            )}
            {thread.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant} ${msg.isError ? styles.bubbleError : ''}`}
              >
                <div className={styles.bubbleIcon}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={styles.bubbleContent}>
                  {msg.isError && <Badge variant="error">Error</Badge>}
                  <div className={styles.bubbleText}>{msg.content}</div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                <div className={styles.bubbleIcon}><Bot size={14} /></div>
                <div className={styles.bubbleContent}>
                  <Spinner size="sm" />
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          <div className={styles.composer}>
            <textarea
              className={styles.composerInput}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasConnectedProvider ? 'Enter user message...' : 'Connect a provider to start chatting'}
              rows={2}
              disabled={!hasConnectedProvider}
            />
            <Button
              onClick={handleSend}
              disabled={!hasConnectedProvider || !userMessage.trim() || !model.trim() || isSending}
              isLoading={isSending}
            >
              <Send size={16} />
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
