# Multi-Tenancy Strategy — Hindlish mein

## Kya Hai Multi-Tenancy?

Multi-tenancy matlab ek hi software instance kai alag-alag companies (tenants) simultaneously use kar rahi hain, aur un sab ka data completely isolated hai. Koi company doosri company ka data nahi dekh sakti.

---

## Tenancy Models Comparison

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Separate DB per tenant** | Har company ki alag database | Complete isolation, easy backup | Expensive, complex migrations |
| **Separate schema per tenant** | Same DB, alag PostgreSQL schemas | Good isolation, slightly cheaper | Schema migration complex |
| **Shared DB + Row filtering** | Same tables, organization_id filter | Simple, cost-effective | App code mein careful filtering |

### Hamara Choice: Shared Database + organization_id

**Kyun yahi choose kiya:**
- Startup/assessment ke liye pragmatic choice
- Single migration file sab tenants cover karta hai
- Operational complexity kam
- PostgreSQL RLS add karke production-grade isolation possible

---

## Implementation

### 1. Database Schema Level

Har tenant-specific table mein `organization_id` column:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- ...
  INDEX idx_projects_org (organization_id)  -- Performance
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  organization_id UUID NOT NULL,  -- Denormalized for fast queries
  -- ...
);
```

**organization_id denormalization in tasks kyun?**
Tasks ka direct access bhi hota hai (e.g., "meri sab tasks"), isliye `JOIN projects` avoid karne ke liye `organization_id` directly tasks mein bhi rakha.

### 2. API Header Level

Har authenticated request mein tenant specify karna padta hai:

```
Headers:
  Authorization: Bearer <accessToken>
  x-organization-id: <orgId>
```

**Kyun JWT mein organization_id nahi?**
Ek user kai orgs mein ho sakta hai. JWT mein ek org fix karna UX ke liye kharab hota. User bina re-login ke org switch kar sakta hai sirf header change karke.

### 3. RolesGuard Level

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'];

    if (!orgId) {
      throw new ForbiddenException('x-organization-id header is required');
    }

    // ⭐ KEY CHECK: Is user is org ka member hai?
    const membership = await this.membershipRepository.findOne({
      where: {
        userId: user.id,
        organizationId: orgId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Membership request par attach karo
    request.currentMembership = membership;
    return true;
  }
}
```

### 4. Service/Repository Level

```typescript
// ✅ Correct: organization_id har query mein
async findAllProjects(orgId: string): Promise<Project[]> {
  return this.projectRepository.find({
    where: {
      organizationId: orgId,  // ← Tenant filter
      status: Not(ProjectStatus.DELETED),
    },
  });
}

// ❌ Wrong: organization_id missing (data leak!)
async findAllProjects(): Promise<Project[]> {
  return this.projectRepository.find();  // Sab tenants ka data!
}
```

### 5. URL Structure

```
/api/v1/organizations/:orgId/projects      ← Org-scoped
/api/v1/organizations/:orgId/tasks         ← Org-scoped
/api/v1/organizations/:orgId/members       ← Org-scoped

/api/v1/auth/me                            ← User-scoped (no orgId)
/api/v1/users/profile                      ← User-scoped
```

---

## Tenant Switching Flow

```
User Alice (member of Org A + Org B)

1. Login → JWT token (no org context)

2. Fetch organizations:
   GET /api/v1/organizations/mine
   → [{ id: 'org-a', name: 'Acme Corp', role: 'ADMIN' },
      { id: 'org-b', name: 'StartupXYZ', role: 'EDITOR' }]

3. Select Org A:
   Frontend Redux mein save: currentOrg = 'org-a'
   Har request mein header: x-organization-id: org-a

4. Switch to Org B:
   Frontend Redux update: currentOrg = 'org-b'
   Header change: x-organization-id: org-b
   → Data automatically org-b specific aa jaata hai
```

---

## Organization Isolation Verification

```
Scenario: Alice (Org A ADMIN) tries to access Org B project

GET /api/v1/organizations/org-b-id/projects/proj-b-1
Headers: Authorization: Bearer <alice-token>
         x-organization-id: org-b-id

Flow:
1. JwtAuthGuard: Alice ka token valid ✅
2. RolesGuard:
   SELECT * FROM memberships
   WHERE user_id = alice-id
     AND organization_id = org-b-id
   → NULL (Alice is not member of Org B)
3. → ForbiddenException('You are not a member of this organization')
4. Response: 403 Forbidden ✅ Data leak nahi hua!
```

---

## Data Access Patterns

### Pattern 1: List Resources

```typescript
// Controller
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
async findAll(@Param('orgId') orgId: string) {
  return this.projectsService.findAll(orgId);
}

// Service — Always org-scoped
async findAll(orgId: string) {
  return this.repo.find({ where: { organizationId: orgId } });
}
```

### Pattern 2: Get Single Resource (with ownership check)

```typescript
async findOne(orgId: string, projectId: string): Promise<Project> {
  const project = await this.repo.findOne({
    where: {
      id: projectId,
      organizationId: orgId,  // ← Cross-tenant access impossible
    },
  });
  if (!project) throw new NotFoundException();
  return project;
}
```

`organizationId` check + `id` check — dono ek saath. Even if user manually URL mein doosri org ka project ID daale, `organizationId` mismatch hogi aur 404 milega.

---

## Production Enhancement: PostgreSQL RLS

Database-level defense-in-depth ke liye (see `DATABASE.md` for full implementation):

```sql
-- Application bug se bhi protected
CREATE POLICY projects_isolation ON projects
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Even if application forgets WHERE clause, DB returns nothing
```

---

## Scaling Considerations

### Current Architecture Bottleneck

Shared database par bahut tenants aa jaayein, ya ek large tenant ke kaafi data ho, toh performance issues aa sakte hain.

### Solutions

1. **PostgreSQL Partitioning:** `organization_id` se table partition karo:
   ```sql
   CREATE TABLE projects (...) PARTITION BY HASH (organization_id);
   CREATE TABLE projects_0 PARTITION OF projects FOR VALUES WITH (MODULUS 4, REMAINDER 0);
   -- ...
   ```

2. **Connection Pooling:** PgBouncer use karo — har tenant ke liye separate connection pool.

3. **Tenant Tier Isolation:** Enterprise tenants ke liye dedicated database cluster.

4. **Read Replicas:** Heavy-read tenants ke liye read replica route karo.
