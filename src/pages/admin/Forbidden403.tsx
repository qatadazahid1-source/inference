import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function Forbidden403() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'var(--color-bg)',
      color: 'var(--color-text-primary)'
    }}>
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          width: 64,
          height: 64,
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <ShieldAlert size={32} />
        </div>
        
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access Denied</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
          You do not have permission to view the Platform Admin Panel. This area is restricted to Ordisum operators.
        </p>

        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-green)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 200ms'
          }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
