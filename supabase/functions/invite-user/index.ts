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

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigins = [
    'https://www.ordisum.com',
    'https://www.ordisum.com',
    'http://localhost:5173',
  ]

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { email, role, organizationId } = await req.json()

    if (!email || !role || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing email, role, or organizationId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // SECURITY FIX: Verify that the invoking user is an active owner or admin of the target organization.
    // Without this, anyone could invite themselves to any organization as an owner.
    const { data: inviterMember, error: inviterError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (inviterError || !inviterMember || !['owner', 'admin'].includes(inviterMember.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only organization owners and admins can invite users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // ENTITLEMENT CHECK: Enforce team_members plan limit
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plans(system_limits)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle()

    const systemLimits = sub?.plans?.system_limits || {}
    const maxTeamMembers = systemLimits.limits?.team_members ?? null

    if (maxTeamMembers !== null) {
      const { count: currentMemberCount, error: memberCountErr } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (memberCountErr) {
        console.error('[invite-user] Error fetching member count:', memberCountErr.message)
      } else if (currentMemberCount !== null && currentMemberCount >= maxTeamMembers) {
        return new Response(
          JSON.stringify({
            error: `Plan limit reached. Your organization is allowed up to ${maxTeamMembers} team members on your current plan.`,
            code: 'ENTITLEMENT_EXCEEDED',
            details: {
              limit: 'team_members',
              current: currentMemberCount,
              max: maxTeamMembers,
              upgrade_required: true,
            },
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    }

    // Check if user exists by getting the user_id for the email
    const { data: inviteeData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (inviteeData) {
      // Check if they are already in the organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', organizationId)
        .eq('user_id', inviteeData.id)
        .maybeSingle()

      if (existingMember?.status === 'active') {
        return new Response(JSON.stringify({ error: 'User is already a member' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      
      const siteUrl = Deno.env.get('SITE_URL') || 'https://www.ordisum.com'
      const inviteUrl = `${siteUrl}/auth/signup?token=${invitationToken}`
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Ordisum <notifications@ordisum.com>'

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `You've been invited to join ${orgName}`,
            html: `
              <h2>You've been invited!</h2>
              <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Ordisum.</p>
              <p>Click the link below to accept the invitation:</p>
              <a href="${inviteUrl}"
                 style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Accept Invitation
              </a>
              <p>This invitation expires in 7 days.</p>
            `,
            text: `You've been invited!\n\n${inviterName} has invited you to join ${orgName} on Ordisum.\n\nCopy and paste the following link into your browser to accept the invitation:\n${inviteUrl}\n\nThis invitation expires in 7 days.`,
          }),
        })

        if (!res.ok) {
          console.error(`[Resend] Failed to send email. HTTP Status: ${res.status}`)
        }
      } catch (err) {
        console.error('[Resend] Fetch error or timeout:', err.message)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    return new Response(JSON.stringify({ success: true, invitation }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('Error inviting user:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
