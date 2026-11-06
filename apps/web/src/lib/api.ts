// Same-origin by default: the API serves the built SPA. VITE_API_URL is only
// an override for pointing a dev build at another host.
const API_BASE = import.meta.env.VITE_API_URL || '';

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

/** Fired when the API says the session is gone, so the app can go to sign-in. */
export const UNAUTHENTICATED_EVENT = 'campsight:unauthenticated';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code: string | undefined = body?.error?.code;
    if (response.status === 401 && code === 'UNAUTHENTICATED') {
      window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
    }
    throw new ApiError(
      body?.error?.message || `Request failed: ${response.status}`,
      response.status,
      code,
    );
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    return handleResponse<T>(res);
  },
};
