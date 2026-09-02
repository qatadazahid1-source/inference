/**
 * Security server-state hooks (Phase 3 — C9).
 *
 * Scope: the authenticated REST security flows exposed by the backend at
 * `/api/security`:
 *   - GET  /api/security/2fa                          → 2FA status
 *   - POST /api/security/2fa/start                    → begin TOTP setup (QR + secret)
 *   - POST /api/security/2fa/verify                   → confirm code, enable 2FA, issue backup codes
 *   - POST /api/security/2fa/disable                  → disable 2FA
 *   - POST /api/security/2fa/backup-codes/regenerate  → regenerate backup codes
 *   - GET  /api/security/sessions                     → active sessions
 *   - POST /api/security/sessions/:id/revoke          → revoke a single session
 *   - POST /api/security/sessions/revoke-all          → revoke all non-current sessions
 *   - GET  /api/security/login-history?limit&offset   → paginated login history
 *
 * Design:
 *   - All calls go through the shared authenticated `axiosClient`, which
 *     attaches the Supabase session token at request time. Tokens, TOTP
 *     secrets, and backup codes are never stored, cached, or logged here.
 *   - The backend wraps successful responses in a `{ data: ... }` envelope
 *     (login-history additionally returns a top-level `total`); hooks unwrap
 *     `data?.data` so consumers read the inner shape.
 *   - Mutations invalidate the narrowest relevant query key (2FA mutations →
 *     `security.twoFactor()`, session mutations → `security.sessions()`) so
 *     only the affected server state refetches.
 *   - Security semantics are preserved exactly: backup codes are surfaced only
 *     from the mutation result (shown once), never re-fetched or persisted.
 *
 * Login history uses `useInfiniteQuery` to preserve the existing "Load more"
 * pagination behavior while gaining React Query caching.
 */

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';

export interface TwoFactorStatus {
    isEnabled: boolean;
    method: string | null;
    verifiedAt: string | null;
    backupCodesRemaining: number;
}

export interface TwoFactorStartResult {
    qrCodeDataUrl: string;
    secret: string;
}

export interface TwoFactorVerifyResult {
    success: boolean;
    backupCodes: string[];
}

export interface SecuritySession {
    id: string;
    device_name: string | null;
    browser: string | null;
    os: string | null;
    location: string | null;
    ip_address: string | null;
    last_active_at: string;
    is_current: boolean;
}

export interface LoginHistoryEntry {
    id: string;
    created_at: string;
    device: string | null;
    location: string | null;
    ip_address: string | null;
    status: 'success' | 'failed' | 'blocked';
}

export interface LoginHistoryPage {
    entries: LoginHistoryEntry[];
    total: number;
    nextOffset: number;
}

export const LOGIN_HISTORY_PAGE_SIZE = 5;

// ─── Queries ─────────────────────────────────────────────────────────

/**
 * GET /api/security/2fa — current two-factor status.
 */
export function useTwoFactorStatus(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.security.twoFactor(),
        queryFn: async (): Promise<TwoFactorStatus> => {
            const { data } = await axiosClient.get<{ data?: TwoFactorStatus }>('/api/security/2fa');
            return (
                data?.data ?? {
                    isEnabled: false,
                    method: null,
                    verifiedAt: null,
                    backupCodesRemaining: 0,
                }
            );
        },
        enabled,
    });
}

/**
 * GET /api/security/sessions — active (non-revoked, unexpired) sessions.
 */
export function useSecuritySessions(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.security.sessions(),
        queryFn: async (): Promise<SecuritySession[]> => {
            const { data } = await axiosClient.get<{ data?: SecuritySession[] }>('/api/security/sessions');
            return data?.data ?? [];
        },
        enabled,
    });
}

/**
 * GET /api/security/login-history — paginated login history ("Load more").
 */
export function useLoginHistory(enabled: boolean = true) {
    return useInfiniteQuery({
        queryKey: queryKeys.security.loginHistory(),
        queryFn: async ({ pageParam }): Promise<LoginHistoryPage> => {
            const offset = pageParam as number;
            const { data } = await axiosClient.get<{ data?: LoginHistoryEntry[]; total?: number }>(
                `/api/security/login-history?limit=${LOGIN_HISTORY_PAGE_SIZE}&offset=${offset}`,
            );
            return {
                entries: data?.data ?? [],
                total: data?.total ?? 0,
                nextOffset: offset + LOGIN_HISTORY_PAGE_SIZE,
            };
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) =>
            lastPage.nextOffset < lastPage.total ? lastPage.nextOffset : undefined,
        enabled,
    });
}

// ─── Mutations ───────────────────────────────────────────────────────

/**
 * POST /api/security/2fa/start — begin TOTP setup. Returns a QR code data URL
 * and the raw secret for manual entry. Does NOT enable 2FA yet.
 */
export function useStart2FA() {
    return useMutation({
        mutationFn: async (): Promise<TwoFactorStartResult> => {
            const { data } = await axiosClient.post<{ data?: TwoFactorStartResult }>('/api/security/2fa/start');
            return data?.data ?? { qrCodeDataUrl: '', secret: '' };
        },
    });
}

/**
 * POST /api/security/2fa/verify — confirm the 6-digit code, enable 2FA, and
 * receive one-time backup codes.
 */
export function useVerify2FA() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (code: string): Promise<TwoFactorVerifyResult> => {
            const { data } = await axiosClient.post<{ data?: TwoFactorVerifyResult }>(
                '/api/security/2fa/verify',
                { code },
            );
            return data?.data ?? { success: false, backupCodes: [] };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.security.twoFactor() });
        },
    });
}

/**
 * POST /api/security/2fa/disable — turn 2FA off.
 */
export function useDisable2FA() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<void> => {
            await axiosClient.post('/api/security/2fa/disable');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.security.twoFactor() });
        },
    });
}

/**
 * POST /api/security/2fa/backup-codes/regenerate — issue a fresh set of
 * one-time backup codes.
 */
export function useRegenerateBackupCodes() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<string[]> => {
            const { data } = await axiosClient.post<{ data?: { backupCodes: string[] } }>(
                '/api/security/2fa/backup-codes/regenerate',
            );
            return data?.data?.backupCodes ?? [];
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.security.twoFactor() });
        },
    });
}

/**
 * POST /api/security/sessions/:id/revoke — revoke a single (non-current) session.
 */
export function useRevokeSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (sessionId: string): Promise<void> => {
            await axiosClient.post(`/api/security/sessions/${sessionId}/revoke`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.security.sessions() });
        },
    });
}

/**
 * POST /api/security/sessions/revoke-all — revoke every session except the current one.
 */
export function useRevokeAllOtherSessions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<void> => {
            await axiosClient.post('/api/security/sessions/revoke-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.security.sessions() });
        },
    });
}
