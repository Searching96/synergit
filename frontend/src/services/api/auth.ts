import { fetcher } from './client'

const BASE = '/auth';

export const authApi = {
  login: (credentials: Record<string, unknown>) => 
    fetcher<{ token: string }>(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),
  register: (userData: Record<string, unknown>) => 
    fetcher<{ message: string }>(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
};
