import apiClient from './apiClient';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types';

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/register', data);
    return res.data.data || res.data;
  },
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/login', data);
    return res.data.data || res.data;
  },
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
  getMe: async () => {
    const res = await apiClient.get('/users/me');
    return res.data.data || res.data;
  },
};
