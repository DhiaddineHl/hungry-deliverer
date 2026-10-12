import axios, { type AxiosError } from 'axios';

import { API_URL } from '@/config/env';
import { isTokenExpired, refreshAccessToken } from '@/services/keycloak/auth-service';
import { getTokens } from '@/services/keycloak/token-storage';

/**
 * Axios instance for the Hungry backend (Spring Boot).
 *
 * - Attaches the Keycloak access token when a session exists, refreshing it
 *   first if expired. Requests made without a session (self-registration)
 *   are simply sent unauthenticated.
 * - Normalizes failures into {@link ApiError} with a user-presentable message
 *   taken from Spring's ProblemDetail payload when available.
 */
// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented entry point
export const apiClient = axios.create({
  baseURL: API_URL,
  // Same rationale as the keycloak service's fetchWithTimeout: RN networking
  // has no default deadline and an unreachable LAN host would hang forever.
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  let tokens = await getTokens();
  if (tokens && isTokenExpired(tokens.accessToken)) {
    const result = await refreshAccessToken();
    tokens = result.success && result.tokens ? result.tokens : null;
  }
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

export class ApiError extends Error {
  readonly status?: number;
  /**
   * The raw error payload. Spring's ProblemDetail carries custom properties
   * beside `detail` — the verification endpoints add `reason` and
   * `retryAfterSeconds` — and callers that branch on those need more than the
   * message.
   */
  readonly data?: Record<string, unknown>;

  constructor(message: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** True when the error is an {@link ApiError} with the given HTTP status. */
export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    if (error.response) {
      const data = error.response.data;
      // A server fault's body is for the logs, not the rider: it can carry
      // stack traces, SQL or internal hostnames. Only 4xx details — validation
      // messages written for the user — are passed through.
      if (error.response.status >= 500) {
        throw new ApiError('The service is unavailable right now. Try again shortly.', error.response.status);
      }
      const message =
        (typeof data?.detail === 'string' && data.detail) || // Spring ProblemDetail
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        `Request failed (${error.response.status})`;
      throw new ApiError(message, error.response.status, data);
    }
    if (error.code === 'ECONNABORTED') {
      throw new ApiError(
        'Could not reach the server. Check that the backend URL is correct and reachable from this device.'
      );
    }
    throw new ApiError('Network error. Please check your connection.');
  }
);
