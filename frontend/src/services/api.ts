/**
 * frontend/src/services/api.ts
 *
 * Core HTTP client for the Logistics Agent frontend.
 * Communicates with FastAPI backend over /api/v1 with standardized error handling and tenant headers.
 */

export const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const API_BASE = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : '';
const BASE_URL = `${API_BASE}/api/v1`;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface PaginatedResult<T> {
  data: T;
  totalCount: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; headers: Headers }> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-Tenant-Id')) {
    headers.set('X-Tenant-Id', DEFAULT_TENANT_ID);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
        errorDetail = String((errorData as { detail: unknown }).detail);
      }
    } catch {
      // Non-JSON error payload
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: {} as T, headers: response.headers };
  }

  const data = (await response.json()) as T;
  return { data, headers: response.headers };
}

export const api = {
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) query = `?${qs}`;
    }
    const res = await request<T>(`${endpoint}${query}`, { method: 'GET' });
    return res.data;
  },

  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<PaginatedResult<T>> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) query = `?${qs}`;
    }
    const res = await request<T>(`${endpoint}${query}`, { method: 'GET' });
    const countHeader = res.headers.get('X-Total-Count');
    const totalCount = countHeader ? parseInt(countHeader, 10) : (Array.isArray(res.data) ? res.data.length : 0);
    return { data: res.data, totalCount };
  },

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.data;
  },

  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const res = await request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.data;
  },

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.data;
  },
};
