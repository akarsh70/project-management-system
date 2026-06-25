import apiClient from './apiClient';
import { User } from '../types';

export const usersApi = {
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data.data || res.data;
  },
  updateMe: async (data: Partial<Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>>): Promise<User> => {
    const res = await apiClient.patch('/users/me', data);
    return res.data.data || res.data;
  },
};
