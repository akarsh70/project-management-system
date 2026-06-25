import { useAppSelector } from '../store';

export function usePermission() {
  const currentRole = useAppSelector((s) => s.organization.currentRole);

  return {
    canCreate: currentRole === 'ADMIN' || currentRole === 'EDITOR',
    canEdit: currentRole === 'ADMIN' || currentRole === 'EDITOR',
    canDelete: currentRole === 'ADMIN',
    canManageMembers: currentRole === 'ADMIN',
    isAdmin: currentRole === 'ADMIN',
    isEditor: currentRole === 'EDITOR',
    isViewer: currentRole === 'VIEWER',
    currentRole,
  };
}
