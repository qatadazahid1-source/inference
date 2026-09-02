import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './axios';

/**
 * Centralized React Query client + default configuration (Phase A).
 *
 * Defaults are intentionally conservative:
 * - A modest `staleTime` avoids refetch storms while keeping data reasonably
 *   fresh. Individual hooks can override per query.
 * - Queries retry a small number of times for transient failures, but NEVER
 *   retry auth/authorization failures (401/403) or other 4xx client errors —
 *   retrying those is pointless and can mask real problems.
 * - Mutations do NOT retry automatically (avoid duplicate writes / double
 *   side-effects). Callers can opt in per mutation if truly idempotent.
 */

/** Default freshness window before a query is considered stale. */
const DEFAULT_STALE_TIME = 30_000; // 30s

/** Max automatic retries for transient query failures. */
const MAX_QUERY_RETRIES = 2;

/**
 * Decide whether a failed query should be retried.
 *
 * Never retry 401/403 (auth/authorization) or any 4xx client error. Retry a
 * limited number of times for network/5xx/unknown transient issues.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    // Do not retry client errors (includes 401 unauthenticated & 403 forbidden).
    if (error.status !== undefined && error.status >= 400 && error.status < 500) {
      return false;
    }
  }
  return failureCount < MAX_QUERY_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // No automatic retries for mutations to avoid duplicate side-effects.
      retry: false,
    },
  },
});

export default queryClient;
