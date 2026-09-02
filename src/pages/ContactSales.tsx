import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { Seo } from '../components/seo/Seo';

const SALES_EMAIL = 'sales@inference-intelligence.com';

export default function ContactSales() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [message, setMessage] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || ' ',
          email,
          company,
          employees: teamSize,
          message
        })
      });

      if (!res.ok) throw new Error('Failed to submit');
      
      setStatus('success');
      setName('');
      setEmail('');
      setCompany('');
      setTeamSize('');
      setMessage('');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <div className="landingBg">
      <Seo
        title="Contact Sales — Ordisum"
        description="Talk to the Ordisum team about enterprise AI API cost management, volume pricing, and onboarding for your organization."
        ogType="website"
      />
      <Navbar />
      <main style={{ minHeight: '60vh', padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 32, textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(212, 162, 76, 0.12)', color: '#d4a24c',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}
          >
            <Mail size={26} />
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, fontFamily: 'Fraunces, serif' }}>
            Talk to Sales
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 40, lineHeight: 1.6 }}>
            Tell us a bit about your team and we'll get back to you about Enterprise
            pricing, data residency, custom SLAs, and on-prem options.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Full name" value={name} onChange={setName} required />
              <FormField label="Work email" type="email" value={email} onChange={setEmail} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Company" value={company} onChange={setCompany} />
              <FormField label="Team size" value={teamSize} onChange={setTeamSize} placeholder="e.g. 50-200" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                What are you looking to solve?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%', background: 'var(--color-card)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: 14,
                  fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>
            {status === 'success' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: 12, borderRadius: 8, fontSize: 14 }}>
                Thank you! We've received your message and will be in touch shortly.
              </div>
            )}
            {status === 'error' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 14 }}>
                Failed to send message. Please try emailing us directly.
              </div>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                marginTop: 8, background: 'var(--color-green)', color: '#fff', border: 'none',
                borderRadius: 999, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1
              }}
            >
              {status === 'loading' ? 'Sending...' : 'Send to Sales'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Prefer email? Reach us directly at{' '}
            <a href={`mailto:${SALES_EMAIL}`} style={{ color: 'var(--color-green)' }}>{SALES_EMAIL}</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FormField({
  label, value, onChange, type = 'text', required = false, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: 14,
        }}
      />
    </div>
  );
}
