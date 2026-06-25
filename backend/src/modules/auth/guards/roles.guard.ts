import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Membership, MemberRole } from '../../../database/entities';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'];

    if (!user || !orgId) throw new ForbiddenException('Organization context required');

    const membershipRepo = this.dataSource.getRepository(Membership);
    const membership = await membershipRepo.findOne({
      where: { userId: user.id, organizationId: orgId, isActive: true },
    });

    if (!membership) throw new ForbiddenException('Not a member of this organization');

    const roleHierarchy = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const minRequiredLevel = Math.min(...requiredRoles.map((r) => roleHierarchy[r] || 0));

    if (userRoleLevel < minRequiredLevel) {
      throw new ForbiddenException(`Required role: ${requiredRoles.join(' or ')}`);
    }

    request.currentMembership = membership;
    return true;
  }
}
