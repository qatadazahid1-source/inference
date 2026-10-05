/**
 * Slack Integration React Query hooks.
 *
 * Endpoints (all through shared axiosClient — auth auto-attached):
 *   GET    /api/slack              -> useSlackIntegration
 *   GET    /api/slack/oauth/init   -> useSlackOAuthInit  (mutation)
 *   GET    /api/slack/channels     -> useSlackChannels
 *   POST   /api/slack/channel      -> useSaveSlackChannel (mutation)
 *   POST   /api/slack/test         -> useTestSlackMessage (mutation)
 *   DELETE /api/slack              -> useDisconnectSlack  (mutation)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlackIntegration {
  id: string;
  channel_name: string | null;
  channel_id: string | null;
  workspace_name: string | null;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the org''s current Slack integration status (no raw token returned).
 * Returns null if the org has no Slack connected.
 */
export function useSlackIntegration(enabled = true) {
  return useQuery<SlackIntegration | null>({
    queryKey: queryKeys.slack.integration(),
    queryFn: async () => {
      const { data } = await axiosClient.get<SlackIntegration | null>(
        '/api/slack',
      );
      return data ?? null;
    },
    enabled,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) => {
      if ((error as { status?: number })?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Fetch available Slack channels in the connected workspace.
 * Only runs when enabled (i.e. after OAuth but before channel selection).
 */
export function useSlackChannels(enabled = false) {
  return useQuery<SlackChannel[]>({
    queryKey: queryKeys.slack.channels(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ channels: SlackChannel[] }>(
        '/api/slack/channels',
      );
      return data?.channels ?? [];
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Initiate Slack OAuth — returns a URL from the backend, then navigates
 * the browser to Slack''s authorization page (full page nav, cross-origin).
 */
export function useSlackOAuthInit() {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const { data } = await axiosClient.get<{ url: string }>(
        '/api/slack/oauth/init',
      );
      if (!data?.url) throw new Error('No OAuth URL returned from server.');
      window.location.href = data.url;
    },
  });
}

/**
 * Save the selected Slack channel (POST /api/slack/channel).
 * Invalidates integration + channel cache on success.
 */
export function useSaveSlackChannel() {
  const queryClient = useQueryClient();
  return useMutation<
    SlackIntegration,
    Error,
    { channel_id: string; channel_name: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await axiosClient.post<SlackIntegration>(
        '/api/slack/channel',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.slack.all });
    },
  });
}

/**
 * Send a test Slack message (POST /api/slack/test).
 */
export function useTestSlackMessage() {
  return useMutation<{ success: boolean; message: string }, Error>({
    mutationFn: async () => {
      const { data } = await axiosClient.post<{
        success: boolean;
        message: string;
      }>('/api/slack/test');
      return data;
    },
  });
}

/**
 * Disconnect Slack (DELETE /api/slack). Clears entire slack cache on success.
 */
export function useDisconnectSlack() {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      await axiosClient.delete('/api/slack');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.slack.all });
    },
  });
}
