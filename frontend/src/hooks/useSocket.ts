import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../store';
import { addNotification } from '../store/slices/notificationSlice';
import { SOCKET_URL } from '../utils/constants';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAppSelector((s) => s.auth);
  const { currentOrg } = useAppSelector((s) => s.organization);

  const connect = useCallback(() => {
    if (!accessToken || socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${accessToken}` },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (currentOrg) socket.emit('join_org', { orgId: currentOrg.id });
    });

    socket.on('notification_new', (notification) => {
      dispatch(addNotification(notification));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current = socket;
  }, [accessToken, currentOrg, dispatch]);

  useEffect(() => {
    if (isAuthenticated) connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, connect]);

  useEffect(() => {
    if (socketRef.current?.connected && currentOrg) {
      socketRef.current.emit('join_org', { orgId: currentOrg.id });
    }
  }, [currentOrg]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, emit, connected: socketRef.current?.connected };
}
