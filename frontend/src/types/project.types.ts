export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  organizationId: string;
  createdBy: string;
  createdByUser?: { id: string; firstName: string; lastName: string; };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput { name: string; description?: string; }
export interface UpdateProjectInput { name?: string; description?: string; status?: ProjectStatus; }
