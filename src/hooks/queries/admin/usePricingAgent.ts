/**
 * Admin Pricing AI Agent React Query hooks (Phase 3, C14).
 *
 * Scope: the platform-admin "Pricing AI Agent" page (`PricingAgent.tsx`) —
 *   - `useSendPricingAgentPrompt`   → POST /api/admin/pricing-agent/chat
 *   - `useExecutePricingAgentAction` → POST /api/admin/pricing-agent/execute
 *
 * Design notes:
 * - Both endpoints are plain REST (request/response JSON) — there is NO SSE /
 *   streaming here, so migrating them to `axiosClient` (via `adminService`) is
 *   correct. (Streaming flows elsewhere, e.g. Playground, intentionally stay on
 *   native `fetch()`.)
 * - Auth + `ApiError` normalization (401 `unauthenticated` vs 403 `forbidden`)
 *   come from the shared `axiosClient` for free; these hooks never call
 *   `supabase.auth.getSession()` directly and never redirect.
 * - These are stateless command mutations: the conversation transcript itself
 *   is local UI state owned by the component, so there is no query cache to
 *   invalidate here. The agent's `execute` step changes landing-pricing plans
 *   server-side, but that is a separate admin surface; callers that display
 *   plans should refetch on their own screens.
 */

import { useMutation } from '@tanstack/react-query';
import { adminService } from '../../../api/services/admin.service';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Send a natural-language prompt to the pricing agent and receive a drafted
 * `preview` (the proposed create/update action + payload).
 */
export function useSendPricingAgentPrompt() {
    return useMutation({
        mutationFn: (prompt: string): Promise<{ preview: any }> =>
            adminService.pricingAgentChat(prompt),
    });
}

/**
 * Execute a previously-previewed pricing agent action (e.g. create_plan /
 * update_plan) after the admin approves it.
 */
export function useExecutePricingAgentAction() {
    return useMutation({
        mutationFn: ({
            action,
            payload,
        }: {
            action: string;
            payload: any;
        }): Promise<any> => adminService.pricingAgentExecute(action, payload),
    });
}
