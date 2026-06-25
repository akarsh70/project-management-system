# Database Design — Hindlish mein

## Overview

**PostgreSQL 16** use kar rahe hain **shared database, single schema** approach ke saath. Tenant isolation application layer par hoti hai (`organization_id` column + RolesGuard), aur database layer par RLS (Row Level Security) optional enhancement ke roop mein documented hai.

---

## Entity Relationship Diagram

```
┌──────────────────┐          ┌──────────────────────┐
│      USERS       │          │    ORGANIZATIONS     │
├──────────────────┤          ├──────────────────────┤
│ id (uuid) PK     │          │ id (uuid) PK         │
│ email (unique)   │          │ name                 │
│ password_hash    │          │ slug (unique)         │
│ first_name       │          │ logo_url             │
│ last_name        │          │ is_active            │
│ avatar_url       │          │ created_at           │
│ is_active        │          │ updated_at           │
│ created_at       │          └──────────┬───────────┘
│ updated_at       │                     │
└────────┬─────────┘                     │
         │                               │
         │         ┌─────────────────────┘
         │         │
         ▼         ▼
┌──────────────────────────────┐
│         MEMBERSHIPS          │
├──────────────────────────────┤
│ id (uuid) PK                 │
│ user_id (FK → users)         │◄── UNIQUE(user_id, organization_id)
│ organization_id (FK → orgs)  │
│ role (ADMIN|EDITOR|VIEWER)   │
│ is_active                    │
│ created_at                   │
│ updated_at                   │
└──────────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────┐
│        PROJECTS          │       │          TASKS           │
├──────────────────────────┤       ├──────────────────────────┤
│ id (uuid) PK             │       │ id (uuid) PK             │
│ name                     │◄──┐   │ title                    │
│ description              │   │   │ description              │
│ status (enum)            │   └───│ project_id (FK)          │
│ organization_id (FK)     │       │ organization_id (FK)     │
│ created_by (FK → users)  │       │ status (enum)            │
│ created_at               │       │ priority (enum)          │
│ updated_at               │       │ assigned_to (FK → users) │
└──────────────────────────┘       │ created_by (FK → users)  │
                                   │ due_date                 │
                                   │ created_at               │
                                   │ updated_at               │
                                   └──────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────┐
│     NOTIFICATIONS        │       │      REFRESH_TOKENS      │
├──────────────────────────┤       ├──────────────────────────┤
│ id (uuid) PK             │       │ id (uuid) PK             │
│ user_id (FK)             │       │ user_id (FK)             │
│ organization_id (FK)     │       │ token_hash (sha256)      │
│ type                     │       │ expires_at               │
│ title                    │       │ is_revoked               │
│ message                  │       │ created_at               │
│ is_read                  │       └──────────────────────────┘
│ data (jsonb)             │
│ created_at               │       ┌──────────────────────────┐
└──────────────────────────┘       │       AUDIT_LOGS         │
                                   ├──────────────────────────┤
                                   │ id (uuid) PK             │
                                   │ user_id (nullable FK)    │
                                   │ organization_id (FK)     │
                                   │ action                   │
                                   │ resource_type            │
                                   │ resource_id              │
                                   │ old_values (jsonb)       │
                                   │ new_values (jsonb)       │
                                   │ ip_address               │
                                   │ user_agent               │
                                   │ created_at               │
                                   └──────────────────────────┘
```

---

## Enums

### Project Status
```
ACTIVE    → Active aur use ho raha project
ARCHIVED  → Preserve kiya, kaam nahi ho raha
DELETED   → Soft delete (data physically nahi jaata)
```

### Task Status (Kanban Columns)
```
TODO        → Kaam start nahi hua
IN_PROGRESS → Kaam chal raha hai
REVIEW      → Review ke liye ready
DONE        → Complete
```

### Task Priority
```
LOW     → Jab time mile tab karo
MEDIUM  → Normal priority
HIGH    → Jaldi karo
URGENT  → Abhi karo
```

### Member Role
```
ADMIN   → Full access + member management
EDITOR  → Create/update/delete (apne resources)
VIEWER  → Sirf read-only
```

---

## Indexing Strategy

```sql
-- Users: email se fast lookup
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Memberships: user ki sab orgs + org ke sab members
CREATE UNIQUE INDEX idx_memberships_user_org
  ON memberships(user_id, organization_id);
CREATE INDEX idx_memberships_org
  ON memberships(organization_id) WHERE is_active = true;

-- Projects: org ke saare active projects
CREATE INDEX idx_projects_org_status
  ON projects(organization_id, status);
CREATE INDEX idx_projects_org_created
  ON projects(organization_id, created_at DESC);

-- Tasks: multiple access patterns
CREATE INDEX idx_tasks_project
  ON tasks(project_id);
CREATE INDEX idx_tasks_org_status
  ON tasks(organization_id, status);
CREATE INDEX idx_tasks_assigned
  ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_due_date
  ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Notifications: unread count + user feed
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, organization_id, is_read)
  WHERE is_read = false;

-- Refresh tokens: fast revocation check
CREATE INDEX idx_refresh_tokens_user_active
  ON refresh_tokens(user_id) WHERE is_revoked = false;

-- Audit logs: time-based org queries
CREATE INDEX idx_audit_logs_org_time
  ON audit_logs(organization_id, created_at DESC);
```

---

## PostgreSQL Row Level Security (RLS)

RLS ek **database-level security layer** hai. Application bug ho aur query mein `organization_id` filter miss ho jaye, tab bhi RLS data leak nahi hone degi.

### RLS Kyun Important Hai?

| Layer | Isolation |
|-------|-----------|
| Application (current) | `WHERE organization_id = ?` in every query |
| RLS (bonus feature) | PostgreSQL itself filters rows |

RLS second line of defense hai. Compliance requirements (GDPR, SOC2) ke liye strongly recommended.

### RLS Implementation

```sql
-- Step 1: Har tenant-scoped table par RLS enable karo
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Policies banao
-- Projects: Sirf apni org ke projects accessible
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
        AND is_active = true
    )
  );

-- Tasks: organization context se
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING (
    organization_id = current_setting('app.current_org_id', true)::uuid
  );

-- Step 3: Admin role ko bypass allow karo (migrations, seeds)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO app_service_role;

-- SuperUser/admin bypass (migration user)
CREATE ROLE app_admin BYPASSRLS;
```

### NestJS mein RLS Context Set Karna

```typescript
// database/rls.interceptor.ts
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const orgId = req.headers['x-organization-id'];
    const userId = req.user?.id;

    if (orgId && userId) {
      // PostgreSQL session variable set karo
      await this.dataSource.query(`
        SELECT set_config('app.current_org_id', $1, true),
               set_config('app.current_user_id', $2, true)
      `, [orgId, userId]);
    }

    return next.handle();
  }
}
```

**Note:** `true` parameter `set_config` mein → transaction-scoped setting (request ke baad automatically reset).

---

## Migration Commands

```bash
# Naya migration generate karo
npm run migration:generate -- src/database/migrations/MigrationName

# Pending migrations run karo
npm run migration:run

# Last migration revert karo
npm run migration:revert

# All migrations status
npm run migration:show
```

---

## Seed Data

```bash
# Demo data seed karo (development ke liye)
npm run seed

# Seed creates:
# - 2 demo organizations
# - 5 demo users (1 admin, 2 editors, 2 viewers per org)
# - 10 projects
# - 30+ tasks (various statuses)
```

---

## Database Design Decisions

### UUIDs as Primary Keys

**Kyun UUID:**
- Distributed systems mein globally unique
- Predictable sequential IDs expose nahi hote (security)
- Merge/import operations aasaan

**Alternative:** BIGSERIAL (simpler, faster index) — lekin sequential IDs user-facing URL mein enumerate karne ka risk.

### JSONB for Flexible Data

`notifications.data` aur `audit_logs.old_values/new_values` ke liye JSONB use kiya:
- Schema-less data store karne ke liye (notification ke saath attachment info, etc.)
- PostgreSQL JSONB indexed aur queryable hai
- Alternative: separate tables — but too much overhead for flexible payloads

### Soft Deletes for Projects

Projects `status = 'DELETED'` se soft delete hote hain. Physical delete nahi:
- Audit trail preserve hota hai
- Accidental delete recover karna possible
- Related tasks orphan nahi hote (referential integrity)
