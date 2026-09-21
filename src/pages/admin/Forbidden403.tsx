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
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          width: 64,
          height: 64,
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-danger-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <ShieldAlert size={32} />
        </div>
        
        <h1 style={{ fontSize: 24, fontWeight: 'var(--fw-extrabold)' as any, marginBottom: 12 }}>Access Denied</h1>
        <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 32, lineHeight: 1.6, fontSize: 14 }}>
          You do not have permission to view the Platform Admin Panel. This area is restricted to Ordisum operators.
        </p>

        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--silver)',
            color: 'var(--color-bg)',
            border: '1px solid var(--silver)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            fontWeight: 'var(--fw-medium)' as any,
            fontFamily: 'var(--font)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
