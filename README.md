# ProjectHub — Multi-Tenant Project Management SaaS

> **Full Stack Engineer Assessment** ke liye banaya gaya ek production-grade SaaS application.

## Project Kya Hai?

**ProjectHub** ek multi-tenant project management tool hai jahan:
- Alag-alag companies (organizations) apne projects aur tasks manage karti hain
- Har company ka data fully isolated rehta hai (multi-tenancy)
- Ek user kai organizations mein alag roles ke saath kaam kar sakta hai
- Real-time updates Socket.IO se milte hain
- Offline draft saving IndexedDB se hoti hai

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

## Quick Start (Docker Compose — Sabse Aasaan)

```bash
# 1. Repo clone karo
git clone https://github.com/akarsh70/project-management-system.git
cd project-management-system

# 2. Environment variables setup karo
cp backend/.env.example backend/.env
# .env mein apni values daalo (default dev values already hain)

# 3. Sab kuch ek command se start karo
docker-compose up --build

# 4. Browser mein access karo:
# Frontend App:   http://localhost
# API:            http://localhost:3000/api/v1
# Swagger Docs:   http://localhost:3000/api/docs
```

---

## Local Development

### Prerequisites (Zaruri cheezein)

```bash
node -v   # 20+ chahiye
npm -v    # 10+ chahiye
psql -V   # PostgreSQL 16
redis-cli -v  # Redis 7
```

### Backend Start

```bash
cd backend
npm install

# Environment file
cp .env.example .env
# .env mein DB credentials, JWT secrets etc. daalo

# Database migrations
npm run migration:run

# Development server (with hot reload)
npm run start:dev
# → http://localhost:3000/api/v1
# → Swagger: http://localhost:3000/api/docs
```

### Frontend Start

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
│   │   ├── config/                  # App, DB, JWT, Redis configs
│   │   ├── database/
│   │   │   ├── entities/            # 8 TypeORM entities (DB tables)
│   │   │   ├── migrations/          # DB migration files
│   │   │   └── seeds/               # Demo data seeder
│   │   └── modules/
│   │       ├── auth/                # JWT auth + refresh tokens + guards
│   │       ├── users/               # User profile management
│   │       ├── organizations/       # Organization CRUD
│   │       ├── memberships/         # RBAC roles management
│   │       ├── projects/            # Projects CRUD + Redis cache
│   │       ├── tasks/               # Tasks CRUD + Kanban logic
│   │       ├── notifications/       # In-app notifications
│   │       ├── payments/            # Payment abstraction (Strategy pattern)
│   │       ├── redis/               # Cache service (ioredis wrapper)
│   │       ├── queue/               # BullMQ job processors
│   │       ├── websocket/           # Socket.IO gateway + presence
│   │       ├── audit/               # Audit logging
│   │       └── common/              # Decorators, guards, filters, interceptors
│   ├── test/
│   │   ├── unit/                    # Jest unit tests
│   │   └── integration/             # Supertest e2e tests
│   ├── .env.example                 # Environment variables template
│   └── package.json
│
├── frontend/                        # React + Vite Application
│   ├── src/
│   │   ├── api/                     # Axios client + React Query hooks
│   │   ├── components/
│   │   │   ├── common/              # ProtectedRoute, ErrorBoundary, etc.
│   │   │   └── layout/              # Sidebar, Header, OrgSwitcher
│   │   ├── hooks/                   # useSocket, useAuth custom hooks
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
├── docs/                            # Detailed documentation (Hindlish)
├── .github/workflows/               # GitHub Actions CI/CD
└── docker-compose.yml               # Full stack dev/staging setup
```

---

## Architecture Decisions

### 1. Multi-Tenancy: Shared Database + organization_id

**Kya choose kiya:** Har table mein `organization_id` column hai. Application layer par isolation.

**Kyun:** Simple to implement, cost-effective. Separate database/schema per tenant expensive aur complex hota hai.

**Alternative:** PostgreSQL RLS (Row Level Security) — database level isolation. Docs mein documented hai, production mein recommended.

**Trade-off:** Har query mein `organization_id` filter lagana padta hai — RolesGuard ensure karta hai.

### 2. JWT: Short Access + Long Refresh + Token Rotation

**Kya choose kiya:** Access token 15min, Refresh token 7 days, rotation on each refresh.

**Kyun:** Short access token = security. Long refresh token = UX (silent renewal). Token rotation = refresh token theft ka risk kam.

**Alternative:** Session-based auth (stateful, simpler) — lekin horizontal scaling mein problem.

### 3. Redis: Cache-Aside + BullMQ

**Kya choose kiya:** Projects cache (300s TTL), BullMQ for async notifications/audit.

**Kyun:** Projects frequently read hote hain. Notifications + audit synchronous karte to request slow hoti.

### 4. Socket.IO: Organization Rooms

**Kya choose kiya:** `org:{orgId}` named rooms.

**Kyun:** Perfect tenant isolation — Org A ke events Org B ko nahi milenge.

### 5. Payment: Strategy Pattern Interface

**Kya choose kiya:** `IPaymentProvider` interface + `MockPaymentProvider` for dev.

**Kyun:** Business logic same rahega jab Stripe/Razorpay add karo. Sirf provider class swap karo.

---

## RBAC Permissions

| Action | ADMIN | EDITOR | VIEWER |
|--------|-------|--------|--------|
| Org Settings | ✅ | ❌ | ❌ |
| Add Members | ✅ | ❌ | ❌ |
| Create Projects | ✅ | ✅ | ❌ |
| Edit Own Projects | ✅ | ✅ | ❌ |
| Edit Others' Projects | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ❌ |
| View All | ✅ | ✅ | ✅ |
| Audit Logs | ✅ | ❌ | ❌ |

---

## Running Tests

```bash
# Backend: Unit tests
cd backend && npm test

# Backend: Coverage report
cd backend && npm run test:cov

# Backend: Integration tests (needs running DB + Redis)
cd backend && npm run test:e2e

# Frontend: E2E tests (needs running app)
cd frontend
npx playwright install  # First time setup
npm run test:e2e
```

---

## API Documentation

Swagger UI available at: **http://localhost:3000/api/docs**

Saare endpoints documented hain with:
- Request body schemas
- Response shapes
- Authentication requirements
- Example values

---

## Bonus Features

Assessment mein requested extra features:

- ✅ **PostgreSQL RLS** — documented in `docs/DATABASE.md`
- ✅ **Fine-grained RBAC** — role hierarchy with service-level checks
- ✅ **Async Audit Logging** — BullMQ queue se async write
- ✅ **Rate Limiting** — NestJS Throttler + Nginx dual layer
- ✅ **WebSocket Presence** — Redis HSET se online users track
- ✅ **OpenTelemetry** — configured in `main.ts`
- ✅ **Offline Drafts** — IndexedDB (`idb` library) for form drafts
- ✅ **Kubernetes + Helm** — production-ready manifests
- ✅ **SSO-Ready** — Passport.js strategy pattern documented
- ✅ **Vault/KMS** — integration documented in `docs/SECURITY.md`

---

## Documentation

Detailed docs in `docs/` folder (Hindlish mein):

| File | Content |
|------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, request flow, diagrams |
| [DATABASE.md](docs/DATABASE.md) | Schema, ERD, indexes, RLS |
| [AUTH.md](docs/AUTH.md) | JWT flow, refresh tokens, SSO |
| [MULTITENANCY.md](docs/MULTITENANCY.md) | Tenant isolation strategy |
| [RBAC.md](docs/RBAC.md) | Roles, permissions matrix |
| [REDIS.md](docs/REDIS.md) | Cache strategy, TTL decisions |
| [BULLMQ.md](docs/BULLMQ.md) | Queue architecture, retry logic |
| [WEBSOCKET.md](docs/WEBSOCKET.md) | Socket.IO rooms, presence |
| [PAYMENTS.md](docs/PAYMENTS.md) | Abstraction layer, adding providers |
| [SECURITY.md](docs/SECURITY.md) | JWT, bcrypt, RBAC, Vault/KMS |
| [OBSERVABILITY.md](docs/OBSERVABILITY.md) | OpenTelemetry, Prometheus |
| [TESTING.md](docs/TESTING.md) | Jest + Playwright strategy |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker + K8s deployment guide |
| [CI_CD.md](docs/CI_CD.md) | GitHub Actions pipeline |
| [API.md](docs/API.md) | OpenAPI reference guide |

---

*Built as Full Stack Engineer Assessment — Enterprise-grade multi-tenant SaaS*
