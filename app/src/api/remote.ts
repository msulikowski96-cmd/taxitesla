import { API_URL } from '../config';
import { Api, ApiError } from './types';

async function request<T>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Brak połączenia z serwerem. Sprawdź internet.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? 'Coś poszło nie tak', res.status);
  return data as T;
}

export const remoteApi: Api = {
  register: (input) => request('/api/auth/register', { method: 'POST', body: input }),
  login: (login, password) => request('/api/auth/login', { method: 'POST', body: { login, password } }),
  me: (token) => request('/api/me', { token }),
  updateProfile: (token, update) => request('/api/me', { method: 'PATCH', token, body: update }),
  deleteAccount: (token) => request('/api/me', { method: 'DELETE', token }),
  listRides: (token) => request('/api/rides', { token }),
  getRide: (token, id) => request(`/api/rides/${id}`, { token }),
  createRide: (token, input) => request('/api/rides', { method: 'POST', token, body: input }),
  cancelRide: (token, id) => request(`/api/rides/${id}/cancel`, { method: 'POST', token }),
  driverJobs: (token) => request('/api/driver/rides', { token }),
  acceptJob: (token, id) => request(`/api/driver/rides/${id}/accept`, { method: 'POST', token }),
  advanceJob: (token, id, status) => request(`/api/driver/rides/${id}/status`, { method: 'POST', token, body: { status } }),
  releaseJob: (token, id) => request(`/api/driver/rides/${id}/release`, { method: 'POST', token }),
};
