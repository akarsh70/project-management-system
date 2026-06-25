# CI/CD Pipeline — Hindlish mein

## GitHub Actions Pipeline

Har PR aur main branch push par automatically run hota hai.

---

## Pipeline Overview

```
Push to PR / main
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
backend-lint-test   frontend-lint-test   [parallel jobs]
       │                  │
       ▼                  ▼
  backend-build      frontend-e2e
       │                  │
       └──────────────────┘
                │
         [only on main]
                │
                ▼
             deploy
```

---

## Pipeline Jobs

### Job 1: `backend-lint-test`

```yaml
backend-lint-test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: pms_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7-alpine
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json

    - name: Install dependencies
      run: npm ci
      working-directory: backend

    - name: Lint (ESLint)
      run: npm run lint
      working-directory: backend

    - name: Type check (TypeScript)
      run: npm run build
      working-directory: backend

    - name: Unit tests + Coverage
      run: npm run test:cov
      working-directory: backend
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_DATABASE: pms_test
        REDIS_HOST: localhost

    - name: Integration tests
      run: npm run test:e2e
      working-directory: backend
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_DATABASE: pms_test
        REDIS_HOST: localhost
        JWT_SECRET: test-secret-min-32-chars-long!!
        JWT_REFRESH_SECRET: test-refresh-secret-min-32-chars!!

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      with:
        directory: backend/coverage
```

### Job 2: `backend-build` (Docker Image)

```yaml
backend-build:
  needs: backend-lint-test
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v4

    - name: Login to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v6
      with:
        context: ./backend
        push: ${{ github.ref == 'refs/heads/main' }}  # Sirf main se push
        tags: |
          ghcr.io/${{ github.repository_owner }}/pms-backend:latest
          ghcr.io/${{ github.repository_owner }}/pms-backend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### Job 3: `frontend-lint-test`

```yaml
frontend-lint-test:
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      run: npm ci
      working-directory: frontend

    - name: Lint (ESLint)
      run: npm run lint
      working-directory: frontend

    - name: Type check (tsc)
      run: npx tsc --noEmit
      working-directory: frontend

    - name: Build check
      run: npm run build
      working-directory: frontend
```

### Job 4: `frontend-e2e` (Playwright)

```yaml
frontend-e2e:
  needs: [backend-lint-test, frontend-lint-test]
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      # ... same as backend job ...
    redis:
      image: redis:7-alpine

  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install backend deps
      run: npm ci
      working-directory: backend

    - name: Start backend
      run: npm run start:prod &
      working-directory: backend
      env:
        DB_HOST: localhost
        REDIS_HOST: localhost
        # ... all env vars ...

    - name: Install frontend deps
      run: npm ci
      working-directory: frontend

    - name: Install Playwright browsers
      run: npx playwright install --with-deps
      working-directory: frontend

    - name: Build frontend
      run: npm run build
      working-directory: frontend

    - name: Serve frontend build
      run: npx serve dist -p 5173 &
      working-directory: frontend

    - name: Wait for services
      run: |
        npx wait-on http://localhost:3000/health
        npx wait-on http://localhost:5173

    - name: Run E2E tests
      run: npm run test:e2e
      working-directory: frontend
      env:
        CI: true
        BASE_URL: http://localhost:5173

    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: frontend/playwright-report/
        retention-days: 30
```

### Job 5: `deploy` (Production)

```yaml
deploy:
  needs: [backend-build, frontend-e2e]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  environment: production  # Manual approval required

  steps:
    - uses: actions/checkout@v4

    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v4
      with:
        namespace: project-management
        manifests: |
          k8s/deployments/backend.yaml
          k8s/deployments/frontend.yaml
        images: |
          ghcr.io/${{ github.repository_owner }}/pms-backend:${{ github.sha }}
          ghcr.io/${{ github.repository_owner }}/pms-frontend:${{ github.sha }}

    - name: Notify Slack (Success)
      if: success()
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "✅ Deployed to production: ${{ github.sha }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

    - name: Notify Slack (Failure)
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: "❌ Production deployment failed: ${{ github.sha }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Secrets (GitHub Repo mein configure karo)

```
Settings → Secrets → Actions → New repository secret

Required secrets:
  GITHUB_TOKEN      ← Automatically provided by GitHub
  KUBE_CONFIG       ← Kubernetes cluster kubeconfig (base64 encoded)
  SLACK_WEBHOOK     ← Slack webhook URL for notifications (optional)
```

---

## Branch Protection Rules

Main branch ke liye:

```
Settings → Branches → Add rule → main

Rules:
  ✅ Require a pull request before merging
  ✅ Require status checks to pass:
     - backend-lint-test
     - frontend-lint-test
     - frontend-e2e
  ✅ Require branches to be up to date
  ✅ Require conversation resolution before merging
  ✅ Do not allow bypassing the above settings
```

---

## Pipeline Times (Approximate)

| Job | Duration |
|-----|----------|
| backend-lint-test | ~3 min |
| backend-build | ~4 min |
| frontend-lint-test | ~2 min |
| frontend-e2e | ~5 min |
| deploy (K8s) | ~2 min |
| **Total (parallel)** | **~8-10 min** |

---

## Caching Strategy

```yaml
# npm cache — dependency install fast karo
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: backend/package-lock.json

# Docker layer cache — image build fast karo
- uses: docker/build-push-action@v6
  with:
    cache-from: type=gha   # GitHub Actions cache
    cache-to: type=gha,mode=max
```

Cache effective hone par:
- `npm install`: ~30s → ~5s
- Docker build: ~3min → ~45s
