# Role-Based Access Control (RBAC) — Hindlish mein

## Roles

| Role | Level | Description |
|------|-------|-------------|
| **ADMIN** | 3 | Organization ka full control. Members manage, settings change, kuch bhi. |
| **EDITOR** | 2 | Content create/edit kar sakta hai. Apne projects/tasks delete kar sakta hai. |
| **VIEWER** | 1 | Sirf read-only. Kuch create/edit/delete nahi kar sakta. |

**Hierarchy:** ADMIN > EDITOR > VIEWER

---

## Permissions Matrix

| Resource | Action | ADMIN | EDITOR | VIEWER |
|----------|--------|:-----:|:------:|:------:|
| **Organization** | | | | |
| | Update name/logo | ✅ | ❌ | ❌ |
| | View details | ✅ | ✅ | ✅ |
| **Members** | | | | |
| | Add new member | ✅ | ❌ | ❌ |
| | Change member role | ✅ | ❌ | ❌ |
| | Remove member | ✅ | ❌ | ❌ |
| | View all members | ✅ | ✅ | ✅ |
| **Projects** | | | | |
| | Create project | ✅ | ✅ | ❌ |
| | Edit own projects | ✅ | ✅ | ❌ |
| | Edit others' projects | ✅ | ❌ | ❌ |
| | Delete own projects | ✅ | ✅ | ❌ |
| | Delete others' projects | ✅ | ❌ | ❌ |
| | View all projects | ✅ | ✅ | ✅ |
| **Tasks** | | | | |
| | Create task | ✅ | ✅ | ❌ |
| | Edit any task | ✅ | ✅ | ❌ |
| | Assign task to others | ✅ | ✅ | ❌ |
| | Delete own tasks | ✅ | ✅ | ❌ |
| | Delete others' tasks | ✅ | ❌ | ❌ |
| | View all tasks | ✅ | ✅ | ✅ |
| **Notifications** | | | | |
| | View own notifications | ✅ | ✅ | ✅ |
| | Mark as read | ✅ | ✅ | ✅ |
| **Audit Logs** | | | | |
| | View org audit logs | ✅ | ❌ | ❌ |

---

## Implementation: Two Layers

RBAC do layers mein implement kiya hai — **Guard level** aur **Service level**.

### Layer 1: RolesGuard (Route-level check)

Controller par decorator lagao, Guard automatically check karta hai:

```typescript
// Controller
@Post()
@Roles(MemberRole.EDITOR)  // EDITOR ya usse upar (ADMIN) allowed
@UseGuards(JwtAuthGuard, RolesGuard)
create(@Param('orgId') orgId: string, @Body() dto: CreateProjectDto) {
  return this.projectsService.create(orgId, dto, request.user.id);
}

@Delete(':id')
@Roles(MemberRole.ADMIN)  // Sirf ADMIN allowed
@UseGuards(JwtAuthGuard, RolesGuard)
remove(@Param('orgId') orgId: string, @Param('id') id: string) {
  // ...
}
```

**Role hierarchy check:**
```typescript
const roleHierarchy = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };

// @Roles(MemberRole.EDITOR) means: EDITOR(2) ya usse zyada level wala
// → ADMIN(3) bhi allowed hai kyunki 3 >= 2
// → VIEWER(1) blocked hai kyunki 1 < 2
```

### Layer 2: Service-level checks (Resource ownership)

Kuch cases mein Guard ke baad bhi service mein check hota hai:

```typescript
// projects.service.ts
async update(
  orgId: string,
  projectId: string,
  dto: UpdateProjectDto,
  userId: string,
  userRole: MemberRole,
): Promise<Project> {
  const project = await this.findOne(orgId, projectId);

  // EDITOR sirf apna project edit kar sakta hai
  if (userRole === MemberRole.EDITOR && project.createdBy !== userId) {
    throw new ForbiddenException('EDITORs can only edit their own projects');
  }

  // ADMIN kisi ka bhi edit kar sakta hai

  Object.assign(project, dto);
  return this.projectRepository.save(project);
}

// tasks.service.ts
async remove(
  orgId: string,
  taskId: string,
  userId: string,
  userRole: MemberRole,
): Promise<void> {
  const task = await this.findOne(orgId, taskId);

  // EDITOR sirf apna task delete kar sakta hai
  if (userRole === MemberRole.EDITOR && task.createdBy !== userId) {
    throw new ForbiddenException('EDITORs can only delete their own tasks');
  }

  await this.taskRepository.remove(task);
}
```

---

## Custom Decorators

### @Roles() Decorator

```typescript
export const Roles = (...roles: MemberRole[]) =>
  SetMetadata(ROLES_KEY, roles);

// Usage:
@Roles(MemberRole.ADMIN)           // Sirf ADMIN
@Roles(MemberRole.EDITOR)          // EDITOR ya ADMIN
@Roles(MemberRole.VIEWER)          // Koi bhi member (VIEWER, EDITOR, ADMIN)
```

### @CurrentUser() Decorator

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage in controller:
@Get('me')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### @OrgId() Decorator

```typescript
export const OrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-organization-id'];
  },
);

// Usage:
@Get('projects')
findProjects(@OrgId() orgId: string) {
  return this.projectsService.findAll(orgId);
}
```

---

## Last Admin Protection

Organization mein koi bhi last ADMIN ko remove ya demote nahi kar sakta:

```typescript
async updateMembership(
  orgId: string,
  memberId: string,
  dto: UpdateMembershipDto,
): Promise<Membership> {
  const membership = await this.findOne(orgId, memberId);

  // Check: Kya hum last ADMIN ko demote karne ki koshish kar rahe hain?
  if (
    membership.role === MemberRole.ADMIN &&
    dto.role !== MemberRole.ADMIN
  ) {
    const adminCount = await this.membershipRepository.count({
      where: {
        organizationId: orgId,
        role: MemberRole.ADMIN,
        isActive: true,
      },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot demote the last admin. Promote another member to ADMIN first.',
      );
    }
  }

  Object.assign(membership, dto);
  return this.membershipRepository.save(membership);
}
```

---

## Frontend RBAC

Frontend par bhi role check hoti hai (UI hide/show ke liye):

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { currentRole } = useSelector((state: RootState) => state.organization);

  return {
    canCreateProject: currentRole === 'ADMIN' || currentRole === 'EDITOR',
    canDeleteProject: currentRole === 'ADMIN' || currentRole === 'EDITOR',
    canManageMembers: currentRole === 'ADMIN',
    canViewAuditLogs: currentRole === 'ADMIN',
    isAdmin: currentRole === 'ADMIN',
    isEditor: currentRole === 'EDITOR',
    isViewer: currentRole === 'VIEWER',
  };
}

// Component mein usage:
const { canCreateProject, canManageMembers } = usePermissions();

return (
  <>
    {canCreateProject && (
      <Button onClick={openCreateDialog}>New Project</Button>
    )}
    {canManageMembers && (
      <Button onClick={openMembersDialog}>Manage Members</Button>
    )}
  </>
);
```

**Important:** Frontend RBAC sirf UX ke liye hai (buttons hide karo). **Security backend par enforce hoti hai** — frontend checks bypass ho sakti hain.
