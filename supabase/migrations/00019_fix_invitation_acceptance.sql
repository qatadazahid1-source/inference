-- 00019_fix_invitation_acceptance.sql
-- Fix for Invitation Acceptance RLS blockade
-- Creates a SECURITY DEFINER function to handle accepting invitations securely
-- without requiring the calling user to already be an owner/admin.

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_max_team_members integer;
  v_current_member_count integer;
  v_user_id uuid;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Find and validate invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = invitation_token
    AND accepted_at IS NULL
    AND cancelled_at IS NULL
  FOR UPDATE; -- lock the row to prevent concurrent acceptance

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already accepted invitation token';
  END IF;

  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- 3. Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    -- If already a member, just mark it accepted so it isn't left hanging, and return the org ID
    UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
    RETURN v_invitation.organization_id;
  END IF;

  -- 4. Check team member limits
  -- Safely extract max members limit if defined in system_limits
  SELECT CAST(NULLIF(p.system_limits->'limits'->>'team_members', '') AS INTEGER) INTO v_max_team_members
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.organization_id = v_invitation.organization_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_max_team_members IS NOT NULL THEN
    SELECT count(*) INTO v_current_member_count
    FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id
      AND status = 'active';

    IF v_current_member_count >= v_max_team_members THEN
      RAISE EXCEPTION 'Plan limit reached. The organization cannot accept more team members.';
    END IF;
  END IF;

  -- 5. Insert membership
  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (v_invitation.organization_id, v_user_id, v_invitation.role, 'active', now());

  -- 6. Mark invitation as accepted
  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  -- 7. Update onboarding progress for the user to mark it completed,
  -- so they don't get forced into creating a new org in /onboarding.
  -- Only update if they haven't completed it.
  UPDATE public.onboarding_progress
  SET current_step = 5,
      step_1_completed = true,
      step_2_completed = true,
      step_3_completed = true,
      completed_at = COALESCE(completed_at, now()),
      organization_id = v_invitation.organization_id
  WHERE user_id = v_user_id
    AND completed_at IS NULL;

  RETURN v_invitation.organization_id;
END;
$$;
