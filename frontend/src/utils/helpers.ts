import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date: string | Date, fmt = 'MMM d, yyyy'): string => {
  try { return format(new Date(date), fmt); } catch { return ''; }
};

export const formatRelativeTime = (date: string | Date): string => {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; }
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

export const truncate = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const classNames = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');
