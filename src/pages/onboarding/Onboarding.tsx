import { useState } from 'react';

import { ArrowRight, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import styles from './Onboarding.module.css';

const roles = ['Developer', 'Manager', 'Founder', 'Other'];
const useCases = ['Analytics', 'Cost Tracking', 'Automation', 'Content Generation', 'Other'];
const companySizes = ['1-10', '10-50', '50+'];
const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'Media', 'Consulting', 'Other'];
const aiProviders = ['OpenAI', 'Anthropic', 'Google AI', 'Mistral AI', 'Cohere', 'AWS Bedrock', 'Other'];

const steps = [
  { label: 'User Info', current: 0 },
  { label: 'Company', current: 1 },
  { label: 'AI Setup', current: 2 },
];

export function Onboarding() {
  const { user } = useAuth();
  
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: User Basic Info
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [role, setRole] = useState('');
  const [useCase, setUseCase] = useState('');

  // Step 2: Company
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');

  // Step 3: AI Provider
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelPrefs, setModelPrefs] = useState('');
  
  const finishOnboarding = async () => {
    try {
      setIsSubmitting(true);

      // Save everything to user_metadata (this simplifies things and works well without needing backend inserts to profiles table immediately,
      // though we should also try to insert into organizations and ai_settings if possible).
      
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          full_name: fullName,
          role,
          use_case: useCase,
          company_name: companyName,
          company_size: companySize,
          industry,
        }
      });

      if (metadataError) throw metadataError;

      // Also persist to `onboarding_progress` — this is the source of truth
      // that ProtectedRoute/AuthContext should check on every login. Relying
      // on auth metadata alone was causing users to get bounced back to
      // onboarding even after completing it, because the local session cache
      // doesn't always reflect updateUser() immediately after a full reload.
      // Note: this row already exists (created by the handle_new_auth_user
      // trigger at signup), so this is always an UPDATE, never an insert.
      if (user?.id) {
        const { error: progressError } = await supabase
          .from('onboarding_progress')
          .update({
            current_step: 5,
            step_1_completed: true,
            step_2_completed: true,
            step_3_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (progressError) {
          console.error('Failed to update onboarding_progress:', progressError);
        }
      }

      // Insert AI settings if provided
      if (provider) {
        await supabase.from('ai_settings').insert({
          user_id: user?.id ?? '',
          provider: provider,
          api_key: apiKey || null,
          model_preference: modelPrefs || null
        });
      }

      // Update organization table if possible
      if (companyName) {
        // Find existing or create new
        const { data: orgs } = await supabase.from('organizations').select('id').eq('user_id', user?.id ?? '').limit(1);
        if (orgs && orgs.length > 0) {
          await supabase.from('organizations').update({
            company_name: companyName,
            company_size: companySize,
            industry: industry
          }).eq('id', orgs[0].id);
        } else {
          await supabase.from('organizations').insert({
            user_id: user?.id,
            name: companyName,
            company_name: companyName,
            company_size: companySize,
            industry: industry
          });
        }
      }

      // Refresh the page to trigger ProtectedRoute logic with new metadata
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      // Fallback redirect
      window.location.href = '/dashboard';
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const progressPercent = (step / 2) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressLine}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          {steps.map((s, i) => {
            let dotClass = styles.stepDotFuture;
            let labelClass = styles.stepLabelFuture;
            if (i === step) { dotClass = styles.stepDotCurrent; labelClass = styles.stepLabelCurrent; }
            if (i < step) { dotClass = styles.stepDotDone; labelClass = styles.stepLabelDone; }
            return (
              <div key={s.label} className={styles.progressStep}>
                <div className={`${styles.stepDot} ${dotClass}`}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={`${styles.stepLabel} ${labelClass}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className={styles.card}>
          {step === 0 && (
            <>
              <h2 className={styles.heading}>Welcome! Let's get started.</h2>
              <p className={styles.subtext}>Tell us a bit about yourself.</p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name</label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Role</label>
                <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Use Case</label>
                <select className={styles.select} value={useCase} onChange={(e) => setUseCase(e.target.value)}>
                  <option value="">Select a use case...</option>
                  {useCases.map((uc) => (
                    <option key={uc} value={uc}>{uc}</option>
                  ))}
                </select>
              </div>

              <div className={styles.actions}>
                <div />
                <Button onClick={handleContinue} disabled={!fullName || !role || !useCase}>
                  Continue <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className={styles.heading}>About your company</h2>
              <p className={styles.subtext}>Help us tailor the experience to your team.</p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Name</label>
                <Input 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Company Size</label>
                <select className={styles.select} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                  <option value="">Select company size...</option>
                  {companySizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Industry</label>
                <select className={styles.select} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="">Select industry...</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.skipLink} onClick={handleSkip}>Skip for now</button>
                  <Button onClick={handleContinue} disabled={!companyName || !companySize || !industry}>
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={styles.heading}>Connect your AI Provider</h2>
              <p className={styles.subtext}>Link your API keys to start tracking costs.</p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary AI Provider</label>
                <select className={styles.select} value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="">Select provider...</option>
                  {aiProviders.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {provider && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>API Key (Optional)</label>
                    <Input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Model Preferences (Optional)</label>
                    <Input 
                      value={modelPrefs}
                      onChange={(e) => setModelPrefs(e.target.value)}
                      placeholder="e.g. gpt-4-turbo"
                    />
                  </div>
                </>
              )}

              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.skipLink} onClick={handleSkip} disabled={isSubmitting}>Skip for now</button>
                  <Button onClick={handleContinue} disabled={isSubmitting}>
                    Finish <Check size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
