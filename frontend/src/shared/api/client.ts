/**
 * Base API client with typed fetch wrapper, auth headers, and error handling.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiException extends Error {
  code: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(message: string, code: string = 'API_ERROR', status: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isAdminRoute = endpoint.includes('/admin/') || endpoint.includes('/auth/login/init/') || endpoint.includes('/auth/login/verify-2fa/');
  const isCustomerAuthInit = endpoint.includes('/auth/customer/register/') || endpoint.includes('/auth/customer/login/');

  let token: string | null = null;
  if (typeof localStorage !== 'undefined') {
    if (isAdminRoute) {
      token = !endpoint.includes('/login/init/') && !endpoint.includes('/login/verify-2fa/')
        ? localStorage.getItem('swiftsats_admin_token')
        : null;
    } else if (!isCustomerAuthInit) {
      token = localStorage.getItem('swiftsats_customer_token');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Automatically sends httpOnly secure cookies
    headers,
  });

  // Handle CSV file download or binary responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If unauthorized or forbidden, invalidate any stale stored token
    if (response.status === 401 || response.status === 403) {
      if (typeof localStorage !== 'undefined') {
        if (isAdminRoute) {
          localStorage.removeItem('swiftsats_admin_token');
        } else if (endpoint.includes('/customer/')) {
          localStorage.removeItem('swiftsats_customer_token');
        }
      }
    }
    const errorData = data?.error || {};
    let message = errorData.message || data?.detail;

    if (!message && typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const firstVal = (data as Record<string, unknown>)[keys[0]];
        if (Array.isArray(firstVal) && firstVal.length > 0 && typeof firstVal[0] === 'string') {
          message = firstVal[0];
        } else if (typeof firstVal === 'string') {
          message = firstVal;
        }
      }
    }

    if (!message) {
      message = response.status >= 500
        ? 'An unexpected server error occurred. Please contact support.'
        : `Request failed with status ${response.status}`;
    }

    const code = errorData.code || 'HTTP_ERROR';
    throw new ApiException(message, code, response.status, errorData.details);
  }

  return data as T;
}
