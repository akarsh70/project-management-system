import apiClient from './apiClient';
import { Notification } from '../types';

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const res = await apiClient.get('/notifications');
    return res.data.data || res.data;
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data.data || res.data;
  },
  markAsRead: async (id: string): Promise<Notification> => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data.data || res.data;
  },
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
