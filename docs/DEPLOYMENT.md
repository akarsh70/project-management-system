# Deployment Guide — Hindlish mein

## Options

| Option | Best For | Complexity |
|--------|----------|------------|
| Docker Compose | Development, Staging | Low |
| Kubernetes | Production, Scale | High |
| Helm Chart | Production (easier K8s) | Medium |

---

## Option 1: Docker Compose

### Services

```yaml
# docker-compose.yml
services:
  postgres:     # PostgreSQL 16
  redis:        # Redis 7
  backend:      # NestJS API (port 3000)
  frontend:     # React app (nginx, port 80)
  nginx:        # Reverse proxy (port 80/443)
```

### Commands

```bash
# Full stack start karo (first time)
docker-compose up --build

# Background mein start karo
docker-compose up --build -d

# Logs dekho
docker-compose logs -f backend
docker-compose logs -f postgres

# Specific service restart karo
docker-compose restart backend

# Scale backend (multiple instances)
docker-compose up --scale backend=3 -d

# Sab kuch stop karo
docker-compose down

# Stop + volumes delete karo (CAUTION: data jaata hai)
docker-compose down -v
```

### Environment Setup

```bash
# .env file copy karo
cp backend/.env.example backend/.env

# .env mein ye zaroor change karo:
JWT_SECRET=your-random-64-char-secret
JWT_REFRESH_SECRET=different-random-64-char-secret
DB_PASSWORD=strong-database-password
REDIS_PASSWORD=strong-redis-password
CORS_ORIGIN=http://localhost  # Ya aapka domain
```

### Verify Everything Is Running

```bash
# Services status
docker-compose ps

# Health check
curl http://localhost:3000/health

# API test
curl http://localhost/api/v1/health

# Swagger UI
open http://localhost:3000/api/docs
```

---

## Option 2: Kubernetes (Production)

### Prerequisites

```bash
# kubectl install karo
# kubectl + cluster access verify karo
kubectl cluster-info

# Helm install karo
helm version
```

### Step-by-Step Deployment

```bash
# 1. Namespace banao
kubectl apply -f k8s/namespace.yaml

# 2. Secrets create karo (PEHLE YE KARO)
kubectl create secret generic backend-secrets \
  --from-literal=DB_PASSWORD=your-db-password \
  --from-literal=JWT_SECRET=your-64-char-jwt-secret \
  --from-literal=JWT_REFRESH_SECRET=your-64-char-refresh-secret \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  -n project-management

# 3. ConfigMaps deploy karo
kubectl apply -f k8s/configmaps/

# 4. Deployments deploy karo
kubectl apply -f k8s/deployments/

# 5. Services aur Ingress deploy karo
kubectl apply -f k8s/services/

# 6. Status check karo
kubectl get pods -n project-management
kubectl get services -n project-management
```

### Health Check

```bash
# Pods running hain?
kubectl get pods -n project-management

# Specific pod logs
kubectl logs -f deployment/backend -n project-management

# Pod mein SSH karo (debugging)
kubectl exec -it deployment/backend -n project-management -- sh

# Service endpoints
kubectl get endpoints -n project-management
```

### Scaling

```bash
# Backend replicas scale karo
kubectl scale deployment backend --replicas=3 -n project-management

# Auto-scaling setup
kubectl apply -f k8s/hpa.yaml  # Horizontal Pod Autoscaler
```

### Rolling Update

```bash
# Naya image deploy karo (zero downtime)
kubectl set image deployment/backend \
  backend=ghcr.io/your-username/project-management-backend:v2.0.0 \
  -n project-management

# Update status dekho
kubectl rollout status deployment/backend -n project-management

# Rollback karo (agar kuch gadbad ho)
kubectl rollout undo deployment/backend -n project-management
```

---

## Option 3: Helm Chart

```bash
# Helm install karo
helm install project-management ./k8s/helm \
  --namespace project-management \
  --create-namespace \
  --set secrets.jwtSecret=your-64-char-secret \
  --set secrets.jwtRefreshSecret=your-refresh-secret \
  --set secrets.dbPassword=your-db-password \
  --set secrets.redisPassword=your-redis-password \
  --set ingress.host=yourapp.com \
  --set backend.replicas=2

# Status
helm status project-management -n project-management

# Upgrade (code update ke baad)
helm upgrade project-management ./k8s/helm \
  -n project-management \
  --set backend.image.tag=v2.0.0

# Values dekho
helm get values project-management -n project-management

# Uninstall
helm uninstall project-management -n project-management
```

### Custom Values File

```yaml
# k8s/helm/values-production.yaml
backend:
  replicas: 3
  image:
    tag: v1.2.0
  resources:
    limits:
      memory: 512Mi
      cpu: 500m
    requests:
      memory: 256Mi
      cpu: 250m

frontend:
  replicas: 2

postgresql:
  enabled: true
  auth:
    database: project_management
    username: pms_user

redis:
  enabled: true

ingress:
  enabled: true
  host: projecthub.yourcompany.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    - secretName: projecthub-tls
      hosts:
        - projecthub.yourcompany.com
```

```bash
helm install project-management ./k8s/helm \
  -f ./k8s/helm/values-production.yaml \
  --set secrets.jwtSecret=actual-secret \
  -n project-management
```

---

## Production Environment Variables

```env
# IMPORTANT: Ye sab production mein change karo
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database (use managed service: RDS, Cloud SQL, etc.)
DB_HOST=your-postgres-host.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=pms_user
DB_PASSWORD=very-strong-password-here
DB_DATABASE=project_management
DB_SSL=true

# JWT (openssl rand -base64 64 se generate karo)
JWT_SECRET=aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ0123456789abcdef
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=different-secret-same-length-aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQ
JWT_REFRESH_EXPIRES_IN=7d

# Redis (use managed service: ElastiCache, Upstash, etc.)
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=very-strong-redis-password
REDIS_TTL=300

# CORS - your frontend domain
CORS_ORIGIN=https://projecthub.yourcompany.com

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## Database Migration in Production

```bash
# ALWAYS backup pehle
pg_dump -h db-host -U pms_user project_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Migrations run karo
npm run migration:run

# Verify
npm run migration:show
```

---

## Monitoring Setup (Production)

```bash
# Prometheus + Grafana stack deploy karo
docker-compose -f docker-compose.monitoring.yml up -d

# Endpoints:
# Prometheus: http://monitoring-server:9090
# Grafana:    http://monitoring-server:3001 (admin/admin)
# Jaeger:     http://monitoring-server:16686
```
