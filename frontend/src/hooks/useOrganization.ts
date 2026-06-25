import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store';
import { setOrganizations, switchOrganization, addOrganization, setCurrentRole } from '../store/slices/organizationSlice';
import { organizationsApi } from '../api/organizations.api';
import { Organization } from '../types';

export function useOrganization() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentOrg, organizations, currentRole } = useAppSelector((s) => s.organization);
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.getAll(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (data) dispatch(setOrganizations(data));
  }, [data, dispatch]);

  // Fetch members to determine current user's role in this org
  const { data: members } = useQuery({
    queryKey: ['members', currentOrg?.id],
    queryFn: () => organizationsApi.getMembers(currentOrg!.id),
    enabled: !!currentOrg && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (members && user?.id) {
      const mine = members.find((m) => m.userId === user.id);
      if (mine) dispatch(setCurrentRole(mine.role));
    }
  }, [members, user?.id, dispatch]);

  const createMutation = useMutation({
    mutationFn: (org: { name: string; slug: string; logoUrl?: string }) =>
      organizationsApi.create(org),
    onSuccess: (newOrg) => {
      dispatch(addOrganization(newOrg));
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const switchOrg = (org: Organization) => {
    dispatch(switchOrganization(org));
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  return {
    currentOrg,
    organizations,
    currentRole,
    isLoading,
    switchOrg,
    createOrg: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
