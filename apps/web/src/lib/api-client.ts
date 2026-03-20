const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type TokenStore = {
  accessToken: string | null;
  refreshToken: string | null;
};

let tokens: TokenStore = { accessToken: null, refreshToken: null };
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string, refresh: string) {
  tokens = { accessToken: access, refreshToken: refresh };
  if (typeof window !== 'undefined') {
    localStorage.setItem('eng_access_token', access);
    localStorage.setItem('eng_refresh_token', refresh);
  }
}

export function clearTokens() {
  tokens = { accessToken: null, refreshToken: null };
  if (typeof window !== 'undefined') {
    localStorage.removeItem('eng_access_token');
    localStorage.removeItem('eng_refresh_token');
  }
}

export function loadTokens(): TokenStore {
  if (typeof window !== 'undefined') {
    tokens = {
      accessToken: localStorage.getItem('eng_access_token'),
      refreshToken: localStorage.getItem('eng_refresh_token'),
    };
  }
  return tokens;
}

export function getAccessToken(): string | null {
  return tokens.accessToken;
}

async function attemptRefresh(): Promise<boolean> {
  if (!tokens.refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = opts;

  let url = `${API_BASE}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (tokens.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(url, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && tokens.refreshToken) {
    if (!refreshPromise) {
      refreshPromise = attemptRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      res = await fetch(url, {
        ...rest,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (res.status === 401) {
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    throw new ApiError(401, 'Unauthorized', null);
  }

  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch {
      /* empty */
    }
    throw new ApiError(res.status, res.statusText, errBody);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export type PaginatedResponse<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
