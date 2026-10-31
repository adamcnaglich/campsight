// Same-origin by default: the API serves the built SPA. VITE_API_URL is only
// an override for pointing a dev build at another host.
const API_BASE = import.meta.env.VITE_API_URL || '';

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Request failed: ${response.status}`,
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
