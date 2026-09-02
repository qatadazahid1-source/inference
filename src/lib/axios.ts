import axios, {
    AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from 'axios';
import { supabase } from './supabase';

/**
 * Shared, authenticated Axios client for backend REST calls (`/api/*`).
 *
 * Design constraints (Phase A):
 * - The Supabase access token is obtained fresh at request time via
 *   `supabase.auth.getSession()`. It is NEVER cached in a module-level
 *   variable, localStorage, cookies, or any custom persistence. Supabase
 *   itself owns session storage and auto-refreshes the token.
 * - Tokens, API keys, and Authorization headers are NEVER logged.
 * - Errors are normalized into a consistent `ApiError` shape while preserving
 *   the HTTP status code so callers can distinguish 401 vs 403 vs other codes.
 * - The interceptor does NOT perform any navigation/redirects. Deciding how to
 *   react to 401/403 (e.g. redirect to login vs. Forbidden403) is left to the
 *   component / hook / routing layer.
 */

/**
 * Categorized error kind so consumers can branch without re-deriving meaning
 * from raw status codes. `unauthenticated` (401) and `forbidden` (403) are
 * intentionally kept distinct.
 */
export type ApiErrorKind =
    | 'unauthenticated' // 401 — no/invalid session
    | 'forbidden' // 403 — authenticated but not allowed (e.g. not a platform admin)
    | 'client' // other 4xx
    | 'server' // 5xx
    | 'network' // request made but no response received
    | 'unknown'; // anything else (e.g. request setup error, cancellation)

/**
 * Normalized application error thrown by the Axios client. Extends the native
 * Error so existing `catch (e) { e.message }` code keeps working, while adding
 * structured fields for richer handling.
 */
export class ApiError extends Error {
    /** HTTP status code, or undefined for network/setup errors. */
    readonly status?: number;
    /** Categorized error kind for ergonomic branching. */
    readonly kind: ApiErrorKind;
    /** Parsed response body, if any. */
    readonly data?: unknown;
    /** The original AxiosError, for advanced consumers. */
    readonly cause?: AxiosError;

    constructor(
        message: string,
        kind: ApiErrorKind,
        status?: number,
        data?: unknown,
        cause?: AxiosError
    ) {
        super(message);
        this.name = 'ApiError';
        this.kind = kind;
        this.status = status;
        this.data = data;
        this.cause = cause;
    }

    get isUnauthenticated(): boolean {
        return this.kind === 'unauthenticated';
    }

    get isForbidden(): boolean {
        return this.kind === 'forbidden';
    }
}

function kindFromStatus(status: number): ApiErrorKind {
    if (status === 401) return 'unauthenticated';
    if (status === 403) return 'forbidden';
    if (status >= 500) return 'server';
    if (status >= 400) return 'client';
    return 'unknown';
}

/**
 * Best-effort extraction of a human-readable message from a backend error
 * body. Backend routes typically respond with `{ error: string }` or
 * `{ message: string }`. Never includes tokens or headers.
 */
function messageFromData(data: unknown, fallback: string): string {
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (typeof obj.error === 'string' && obj.error) return obj.error;
        if (typeof obj.message === 'string' && obj.message) return obj.message;
    }
    return fallback;
}

export const axiosClient: AxiosInstance = axios.create({
    // Backend REST routes are served under `/api/*` on the same origin (proxied
    // by Vite in dev). Keeping baseURL empty preserves the existing absolute
    // `/api/...` paths used throughout the current services.
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor: attach the current Supabase access token.
 *
 * We read the session at request time so an in-flight refresh is respected and
 * we never rely on a stale cached token. If there is no session we simply omit
 * the Authorization header (mirroring the more permissive of the two existing
 * `fetchWithAuth` implementations); the backend will respond 401 and the error
 * interceptor will surface that as an `unauthenticated` ApiError.
 */
axiosClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        return config;
    }
);

/**
 * Response interceptor: normalize all failures into `ApiError`.
 *
 * No redirects happen here. We only categorize and re-throw so the calling
 * layer retains full control over navigation.
 */
axiosClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // A response was received with a non-2xx status.
        if (error.response) {
            const status = error.response.status;
            const kind = kindFromStatus(status);
            const message = messageFromData(
                error.response.data,
                `HTTP error! status: ${status}`
            );
            return Promise.reject(
                new ApiError(message, kind, status, error.response.data, error)
            );
        }

        // The request was made but no response was received.
        if (error.request) {
            return Promise.reject(
                new ApiError(
                    'Network error: no response received',
                    'network',
                    undefined,
                    undefined,
                    error
                )
            );
        }

        // Something happened setting up the request (or it was cancelled).
        return Promise.reject(
            new ApiError(
                error.message || 'Unexpected request error',
                'unknown',
                undefined,
                undefined,
                error
            )
        );
    }
);

export default axiosClient;
