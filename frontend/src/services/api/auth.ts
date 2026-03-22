import { fetcher } from './client'

const BASE = '/auth';

export const authApi = {
  login: (credentials: any) => 
    fetcher<{ token: string }>(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),
  register: (userData: any) => 
    fetcher<{ message: string }>(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
};