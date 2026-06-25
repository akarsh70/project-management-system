export type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  isActive: boolean;
  user?: { id: string; email: string; firstName: string; lastName: string; avatarUrl?: string; };
  organization?: Organization;
  createdAt: string;
}

export interface OrgState {
  currentOrg: Organization | null;
  organizations: Organization[];
  currentRole: MemberRole | null;
}
