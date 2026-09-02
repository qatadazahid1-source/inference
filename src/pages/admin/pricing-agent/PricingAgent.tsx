import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Check, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { ApiError } from '../../../lib/axios';
import {
  useSendPricingAgentPrompt,
  useExecutePricingAgentAction,
} from '../../../hooks/queries/admin/usePricingAgent';
import styles from './PricingAgent.module.css';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  preview?: {
    action: 'create_plan' | 'update_plan';
    payload: any;
    provider: string;
  };
  status?: 'pending' | 'approved' | 'rejected' | 'error';
}

export function PricingAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: 'Hello! I am the Pricing AI Agent. Tell me what kind of plan you want to create or edit, and I will draft it for you.'
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendPrompt = useSendPricingAgentPrompt();
  const executeAction = useExecutePricingAgentAction();

  // The "Thinking..." indicator tracks the in-flight chat request.
  const isLoading = sendPrompt.isPending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const json = await sendPrompt.mutateAsync(userMessage.content);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        content: `I've prepared a draft for your request. Please review the details below.`,
        preview: json.preview,
        status: 'pending'
      }]);

    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to get response';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        content: `Error: ${message}`
      }]);
    }
  };

  const handleApprove = async (messageId: string, preview: any) => {
    try {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'approved', content: 'Processing approval...' } : m));

      await executeAction.mutateAsync({ action: preview.action, payload: preview.payload });

      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        content: `✅ Success! The plan "${preview.payload.name || preview.payload.updates?.name}" has been ${preview.action === 'create_plan' ? 'created' : 'updated'} and is now live across the platform.`
      } : m));

    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to execute action';
      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        status: 'error',
        content: `❌ Failed to execute: ${message}`
      } : m));
    }
  };

  const handleReject = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'rejected', content: 'Action cancelled.' } : m));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pricing AI Agent</h1>
        <p>Manage subscription plans naturally. Powered by GPT-4o with Claude-3.5 fallback.</p>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messagesArea}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.messageRow} ${styles[msg.role]}`}>
              <div className={styles.avatar}>
                {msg.role === 'agent' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div>
                <div className={styles.messageContent}>
                  {msg.content}
                </div>

                {msg.preview && msg.status === 'pending' && (
                  <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                      <h4>{msg.preview.action === 'create_plan' ? 'Draft: New Plan' : 'Draft: Update Plan'}</h4>
                      <small style={{ color: '#94a3b8' }}>via {msg.preview.provider}</small>
                    </div>
                    <div className={styles.previewBody}>
                      <pre>{JSON.stringify(msg.preview.payload, null, 2)}</pre>
                    </div>
                    <div className={styles.previewActions}>
                      <Button variant="ghost" size="sm" onClick={() => handleReject(msg.id)}>
                        <X size={16} /> Cancel
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleApprove(msg.id, msg.preview)}>
                        <Check size={16} /> Approve & Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageRow} ${styles.agent}`}>
              <div className={styles.avatar}><Bot size={20} /></div>
              <div className={styles.messageContent}>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <form className={styles.inputForm} onSubmit={handleSend}>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Create a Pro plan for $29/mo with 5 integrations..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className={styles.sendButton} disabled={!input.trim() || isLoading}>
              <Send size={18} />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
