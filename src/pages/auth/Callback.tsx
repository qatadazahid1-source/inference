import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const hasHandled = useRef(false)

  useEffect(() => {
    // Race-condition fix: detectSessionInUrl may already have resolved the
    // session by the time this effect runs, so the SIGNED_IN event from
    // onAuthStateChange can fire before this listener is attached (or not
    // fire again at all). Check getSession() immediately AND keep the
    // listener as a fallback for slower cases.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !hasHandled.current) {
        hasHandled.current = true
        handlePostLogin(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !hasHandled.current) {
        hasHandled.current = true
        handlePostLogin(session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handlePostLogin(userId: string) {
    // Fire-and-forget: records this login in login_history/security_sessions
    // (see backend POST /api/security/track-login). Nothing in the Google
    // OAuth flow writes to those tables otherwise, so without this the
    // Security settings page would always be empty. Not awaited — a
    // tracking failure should never block getting the user into the app.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/security/track-login', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch((err) => console.error('[AuthCallback] track-login failed:', err));
    });

    // Note: the `handle_new_auth_user` DB trigger creates a `public.users` row
    // for EVERY signup immediately, so checking `users` for existence can
    // never tell us "new vs returning user" — it will always find a row.
    // The real source of truth for onboarding status is
    // `onboarding_progress.completed_at` (row also created by that trigger).
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .select('completed_at, skipped_at')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[AuthCallback] Failed to check onboarding progress:', error)
      // Fail safe: send to dashboard rather than stranding the user on a blank screen
      navigate('/dashboard', { replace: true })
      return
    }

    const isOnboarded = !!(progress?.completed_at || progress?.skipped_at)

    if (!isOnboarded) {
      // New user still needs an organization created via onboarding before
      // any checkout can happen (checkout needs a real organizationId) —
      // pending_plan (if any) stays in localStorage and is picked up once
      // onboarding finishes instead of here.
      navigate('/onboarding', { replace: true })
    } else {
      const pendingPlan = localStorage.getItem('pending_plan')
      if (pendingPlan) {
        localStorage.removeItem('pending_plan')
        navigate(`/settings/billing?autoupgrade=${pendingPlan}`, { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e1619',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f8fafc',
      fontFamily: 'Geist, sans-serif'
    }}>
      <p>Signing you in…</p>
    </div>
  )
}
