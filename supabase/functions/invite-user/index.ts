// ============================================================================
// Invite User — sends invitation email and creates pending membership
// ============================================================================
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { email, role, organizationId } = await req.json()

    if (!email || !role || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing email, role, or organizationId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user exists
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id) // can check by joining to users table
      .single()

    if (existingMember?.status === 'active') {
      // Already a member
      return new Response(JSON.stringify({ error: 'User is already a member' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate invitation token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const invitationToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Create invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        token: invitationToken,
        invited_by: user.id,
      })
      .select()
      .single()

    if (invError) {
      return new Response(JSON.stringify({ error: invError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send invitation email via Resend if API key is configured
    if (resendApiKey) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

      const inviterName = user.email || 'A team member'
      const orgName = org?.name || 'the organization'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Inference Intelligence <team@inferenceintelligence.com>',
          to: [email],
          subject: `You've been invited to join ${orgName}`,
          html: `
            <h2>You've been invited!</h2>
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Inference Intelligence.</p>
            <p>Click the link below to accept the invitation:</p>
            <a href="${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/auth/signup?token=${invitationToken}"
               style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accept Invitation
            </a>
            <p>This invitation expires in 7 days.</p>
          `,
        }),
      })

      if (!res.ok) {
        console.error('Failed to send email:', await res.text())
      }
    }

    return new Response(JSON.stringify({ success: true, invitation }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error inviting user:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
