import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store';
import { setNotifications, markRead, markAllRead } from '../store/slices/notificationSlice';
import { notificationsApi } from '../api/notifications.api';

export function useNotifications() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { notifications, unreadCount } = useAppSelector((s) => s.notifications);
  const { currentOrg } = useAppSelector((s) => s.organization);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', currentOrg?.id],
    queryFn: () => notificationsApi.getAll(),
    enabled: !!currentOrg,
    refetchInterval: 30_000, // Poll every 30s as fallback
  });

  useEffect(() => {
    if (data) dispatch(setNotifications(data));
  }, [data, dispatch]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: (_, id) => dispatch(markRead(id)),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => dispatch(markAllRead()),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
  };
}
