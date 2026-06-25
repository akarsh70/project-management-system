export type NotificationType =
  | 'PROJECT_CREATED' | 'PROJECT_UPDATED'
  | 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'MEMBER_ADDED';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  organizationId: string;
  createdAt: string;
}
