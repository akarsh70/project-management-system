import apiClient from './apiClient';
import { Project, CreateProjectInput, UpdateProjectInput } from '../types';

export const projectsApi = {
  getAll: async (orgId: string): Promise<Project[]> => {
    const res = await apiClient.get(`/organizations/${orgId}/projects`);
    return res.data.data || res.data;
  },
  create: async (orgId: string, data: CreateProjectInput): Promise<Project> => {
    const res = await apiClient.post(`/organizations/${orgId}/projects`, data);
    return res.data.data || res.data;
  },
  getById: async (orgId: string, id: string): Promise<Project> => {
    const res = await apiClient.get(`/organizations/${orgId}/projects/${id}`);
    return res.data.data || res.data;
  },
  update: async (orgId: string, id: string, data: UpdateProjectInput): Promise<Project> => {
    const res = await apiClient.patch(`/organizations/${orgId}/projects/${id}`, data);
    return res.data.data || res.data;
  },
  delete: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/projects/${id}`);
  },
};
