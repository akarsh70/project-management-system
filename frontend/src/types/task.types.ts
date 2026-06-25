export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  organizationId: string;
  assignedTo?: string;
  assignedToUser?: { id: string; firstName: string; lastName: string; avatarUrl?: string; };
  createdBy: string;
  createdByUser?: { id: string; firstName: string; lastName: string; };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string; description?: string; priority?: TaskPriority;
  assignedTo?: string; dueDate?: string;
}
export interface UpdateTaskInput {
  title?: string; description?: string; status?: TaskStatus;
  priority?: TaskPriority; assignedTo?: string; dueDate?: string;
}
