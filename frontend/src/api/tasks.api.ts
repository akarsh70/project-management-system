import apiClient from './apiClient';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types';

export const tasksApi = {
  getAll: async (orgId: string, projectId: string): Promise<Task[]> => {
    const res = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/tasks`);
    return res.data.data || res.data;
  },
  create: async (orgId: string, projectId: string, data: CreateTaskInput): Promise<Task> => {
    const res = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/tasks`, data);
    return res.data.data || res.data;
  },
  update: async (orgId: string, projectId: string, id: string, data: UpdateTaskInput): Promise<Task> => {
    const res = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}/tasks/${id}`, data);
    return res.data.data || res.data;
  },
  delete: async (orgId: string, projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/projects/${projectId}/tasks/${id}`);
  },
};
