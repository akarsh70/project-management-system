# ProjectHub — Multi-Tenant Project Management SaaS

> A production-grade SaaS application built as a Full Stack Engineer Assessment.

## Overview

**ProjectHub** is a multi-tenant project management platform where:
- Multiple companies (organizations) manage their projects and tasks independently
- Each organization's data is fully isolated (multi-tenancy)
- A single user can belong to multiple organizations with different roles
- Real-time updates are delivered via Socket.IO
- Offline draft saving is supported via IndexedDB

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend Framework** | React + TypeScript | 18 |
| **Build Tool** | Vite | 5 |
| **UI Library** | Material UI (MUI) | v7 |
| **State (Client)** | Redux Toolkit | 2 |
| **State (Server)** | TanStack Query | v5 |
| **Backend Framework** | NestJS + TypeScript | 10 |
| **Database** | PostgreSQL | 16 |
| **ORM** | TypeORM | 0.3 |
| **Cache** | Redis + ioredis | 7 |
| **Queue** | BullMQ | 5 |
| **Real-time** | Socket.IO | 4 |
| **Auth** | JWT + Passport.js | — |
| **Reverse Proxy** | Nginx | latest |
| **Container** | Docker + Compose | — |
| **Orchestration** | Kubernetes + Helm | — |
| **CI/CD** | GitHub Actions | — |
| **Testing** | Jest + Supertest + Playwright | — |

---

## Quick Start (Docker Compose — Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/akarsh70/project-management-system.git
cd project-management-system

# 2. Set up environment variables
cp backend/.env.example backend/.env
# Default dev values are already configured

# 3. Start everything with a single command
docker-compose up --build

# 4. Access in your browser:
# Frontend App:   http://localhost
# API:            http://localhost:3000/api/v1
# Swagger Docs:   http://localhost:3000/api/docs
```

---

## Local Development

### Prerequisites

```bash
node -v   # 20+ required
npm -v    # 10+ required
psql -V   # PostgreSQL 16
redis-cli -v  # Redis 7
```

### Backend

```bash
cd backend
npm install

# Set up environment file
cp .env.example .env
# Configure DB credentials, JWT secrets, etc.

# Run database migrations
npm run migration:run

# Start development server (with hot reload)
npm run start:dev
# → http://localhost:3000/api/v1
# → Swagger: http://localhost:3000/api/docs
```

### Frontend

```bash
cd frontend
npm install

npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
project-management-system/
├── backend/                         # NestJS API Server
│   ├── src/
│   │   ├── config/                  # App, DB, JWT, Redis configuration
│   │   ├── database/
│   │   │   ├── entities/            # 8 TypeORM entities (DB tables)
│   │   │   ├── migrations/          # Database migration files
│   │   │   └── seeds/               # Demo data seeder
│   │   └── modules/
│   │       ├── auth/                # JWT auth + refresh tokens + guards
│   │       ├── users/               # User profile management
│   │       ├── organizations/       # Organization CRUD
│   │       ├── memberships/         # RBAC roles management
│   │       ├── projects/            # Projects CRUD + Redis cache
│   │       ├── tasks/               # Tasks CRUD + assignment logic
│   │       ├── notifications/       # In-app notifications
│   │       ├── payments/            # Payment abstraction (Strategy pattern)
│   │       ├── redis/               # Cache service (ioredis wrapper)
│   │       ├── queue/               # BullMQ job processors
│   │       ├── websocket/           # Socket.IO gateway + presence
│   │       ├── audit/               # Audit logging
│   │       └── common/              # Decorators, guards, filters, interceptors
│   ├── test/
│   │   ├── unit/                    # Jest unit tests
│   │   └── integration/             # Supertest integration tests
│   ├── .env.example                 # Environment variables template
│   └── package.json
│
├── frontend/                        # React + Vite Application
│   ├── src/
│   │   ├── api/                     # Axios client + API functions
│   │   ├── components/
│   │   │   ├── common/              # ProtectedRoute, ErrorBoundary, etc.
│   │   │   └── layout/              # Sidebar, Header, OrgSwitcher
│   │   ├── hooks/                   # useSocket, useAuth, custom hooks
│   │   ├── pages/                   # Route pages (Login, Dashboard, etc.)
│   │   ├── store/                   # Redux Toolkit slices
│   │   ├── theme/                   # MUI light/dark theme
│   │   ├── types/                   # TypeScript interfaces
│   │   └── utils/                   # IndexedDB, helpers, constants
│   ├── e2e/                         # Playwright E2E tests
│   └── package.json
│
├── nginx/                           # Reverse proxy configuration
│   ├── nginx.conf                   # Rate limiting, SSL, WebSocket proxy
│   └── Dockerfile                   # Multi-stage nginx image
│
├── k8s/                             # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmaps/
│   ├── deployments/
│   └── helm/                        # Helm chart for easy deployment
│
├── docs/                            # Detailed technical documentation
├── .github/workflows/               # GitHub Actions CI/CD pipeline
└── docker-compose.yml               # Full stack development setup
```

---

## Architecture Decisions

### 1. Multi-Tenancy: Shared Database + organization_id

**Approach:** Every tenant-scoped table includes an `organization_id` column. Isolation is enforced at the application layer via `RolesGuard`.

**Rationale:** Simpler to implement and cost-effective. Separate databases per tenant introduce significant operational complexity.

**Production Enhancement:** PostgreSQL Row Level Security (RLS) can be added as a second layer of defense — fully documented in `docs/DATABASE.md`.

**Trade-off:** Every query must include an `organization_id` filter — the `RolesGuard` enforces this contract.

### 2. JWT: Short Access + Long Refresh + Token Rotation

**Approach:** 15-minute access tokens, 7-day refresh tokens with rotation on each use.

**Rationale:** Short-lived access tokens minimize exposure if stolen. Refresh token rotation ensures that a stolen refresh token is detected on the next legitimate use.

**Alternative:** Session-based auth (simpler but problematic for horizontal scaling).

### 3. Redis: Cache-Aside Pattern + BullMQ

**Approach:** Project lists cached with 300s TTL; notifications and audit logs processed asynchronously via BullMQ.

**Rationale:** Projects are frequently read with low write frequency. Processing notifications synchronously would add significant latency to API responses.

### 4. Socket.IO: Organization Rooms

**Approach:** Named rooms following the pattern `org:{orgId}`.

**Rationale:** Provides perfect tenant isolation — events from Organization A are never delivered to members of Organization B.

### 5. Payment: Strategy Pattern

**Approach:** `IPaymentProvider` interface with `MockPaymentProvider` for development.

**Rationale:** Swapping to Stripe or Razorpay in production requires changing a single line in `payments.module.ts`. All business logic remains unchanged.

---

## RBAC Permissions

| Action | ADMIN | EDITOR | VIEWER |
|--------|-------|--------|--------|
| Organization Settings | ✅ | ❌ | ❌ |
| Add / Remove Members | ✅ | ❌ | ❌ |
| Create Projects | ✅ | ✅ | ❌ |
| Edit Own Projects | ✅ | ✅ | ❌ |
| Edit Others' Projects | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ❌ |
| View All | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ | ❌ | ❌ |

---

## Running Tests

```bash
# Backend: Unit tests
cd backend && npm test

# Backend: Coverage report
cd backend && npm run test:cov

# Backend: Integration tests (requires running DB + Redis)
cd backend && npm run test:e2e

# Frontend: E2E tests (requires running app)
cd frontend
npx playwright install  # First-time setup
npm run test:e2e
```

---

## API Documentation

Swagger UI is available at: **http://localhost:3000/api/docs**

All endpoints are documented with:
- Request body schemas
- Response shapes
- Authentication requirements
- Example values

---

## Bonus Features

Additional features implemented beyond core requirements:

- ✅ **PostgreSQL RLS** — documented in `docs/DATABASE.md`
- ✅ **Fine-grained RBAC** — role hierarchy with service-level ownership checks
- ✅ **Async Audit Logging** — written via BullMQ queue (non-blocking)
- ✅ **Rate Limiting** — NestJS Throttler + Nginx dual-layer protection
- ✅ **WebSocket Presence** — online user tracking via Redis HSET
- ✅ **OpenTelemetry** — distributed tracing configured in `main.ts`
- ✅ **Offline Drafts** — IndexedDB (`idb` library) for form draft persistence
- ✅ **Kubernetes + Helm** — production-ready manifests
- ✅ **SSO-Ready** — Passport.js strategy pattern documented for SAML/OIDC/Google
- ✅ **Vault/KMS** — secrets management integration documented in `docs/SECURITY.md`

---

## Documentation

| File | Content |
|------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, request flow, module structure |
| [DATABASE.md](docs/DATABASE.md) | Schema, ERD, indexes, RLS |
| [AUTH.md](docs/AUTH.md) | JWT flow, refresh tokens, SSO |
| [MULTITENANCY.md](docs/MULTITENANCY.md) | Tenant isolation strategy |
| [RBAC.md](docs/RBAC.md) | Roles, permissions matrix |
| [REDIS.md](docs/REDIS.md) | Cache strategy, TTL decisions |
| [BULLMQ.md](docs/BULLMQ.md) | Queue architecture, retry logic |
| [WEBSOCKET.md](docs/WEBSOCKET.md) | Socket.IO rooms, presence tracking |
| [PAYMENTS.md](docs/PAYMENTS.md) | Abstraction layer, adding providers |
| [SECURITY.md](docs/SECURITY.md) | JWT, bcrypt, RBAC, Vault/KMS |
| [OBSERVABILITY.md](docs/OBSERVABILITY.md) | OpenTelemetry, Prometheus, Grafana |
| [TESTING.md](docs/TESTING.md) | Jest + Playwright testing strategy |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker + Kubernetes deployment guide |
| [CI_CD.md](docs/CI_CD.md) | GitHub Actions pipeline |
| [API.md](docs/API.md) | OpenAPI reference guide |

---

*Built as a Full Stack Engineer Assessment — Enterprise-grade multi-tenant SaaS*
