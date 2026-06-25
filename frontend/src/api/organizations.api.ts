import apiClient from './apiClient';
import { Organization, Membership, MemberRole } from '../types';

export const organizationsApi = {
  getAll: async (): Promise<Organization[]> => {
    const res = await apiClient.get('/organizations');
    return res.data.data || res.data;
  },
  create: async (data: { name: string; slug: string; logoUrl?: string }): Promise<Organization> => {
    const res = await apiClient.post('/organizations', data);
    return res.data.data || res.data;
  },
  getById: async (id: string): Promise<Organization> => {
    const res = await apiClient.get(`/organizations/${id}`);
    return res.data.data || res.data;
  },
  update: async (id: string, data: Partial<Organization>): Promise<Organization> => {
    const res = await apiClient.patch(`/organizations/${id}`, data);
    return res.data.data || res.data;
  },
  getMembers: async (orgId: string): Promise<Membership[]> => {
    const res = await apiClient.get(`/organizations/${orgId}/members`);
    return res.data.data || res.data;
  },
  addMember: async (orgId: string, email: string, role: MemberRole): Promise<Membership> => {
    const res = await apiClient.post(`/organizations/${orgId}/members`, { email, role });
    return res.data.data || res.data;
  },
  updateMember: async (orgId: string, userId: string, role: MemberRole): Promise<Membership> => {
    const res = await apiClient.patch(`/organizations/${orgId}/members/${userId}`, { role });
    return res.data.data || res.data;
  },
  removeMember: async (orgId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
  },
};
