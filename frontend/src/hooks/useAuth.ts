import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials, logout as logoutAction, updateUser } from '../store/slices/authSlice';
import { clearOrganizations } from '../store/slices/organizationSlice';
import { authApi } from '../api/auth.api';
import { LoginRequest, RegisterRequest } from '../types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, accessToken } = useAppSelector((s) => s.auth);

  // Restore user profile on page refresh (token exists but user object is null)
  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated && !user,
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (meData && !user) {
      dispatch(updateUser(meData));
    }
  }, [meData, user, dispatch]);

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      dispatch(logoutAction());
      dispatch(clearOrganizations());
      queryClient.clear();
      navigate('/login');
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoginLoading: loginMutation.isPending,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegisterLoading: registerMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
