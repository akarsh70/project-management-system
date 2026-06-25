export const APP_NAME = 'ProjectHub';
export const API_BASE_URL = '/api/v1';
export const SOCKET_URL = '';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  TASKS: '/tasks',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: '#94A3B8', IN_PROGRESS: '#3B82F6', REVIEW: '#F59E0B', DONE: '#22C55E',
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22C55E', MEDIUM: '#3B82F6', HIGH: '#F59E0B', URGENT: '#EF4444',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', EDITOR: 'Editor', VIEWER: 'Viewer',
};
