# Testing Strategy — Hindlish mein

## Testing Pyramid

```
           /\
          /  \
         / E2E\          ← Playwright (few, slow, full user flow)
        /──────\
       / Integr.\        ← Supertest (medium, API contracts)
      /──────────\
     /  Unit Tests\      ← Jest (many, fast, isolated)
    /______________\
```

---

## 1. Unit Tests (Jest)

Fast aur isolated tests. External dependencies mock karte hain.

### Backend Unit Tests

```typescript
// backend/test/unit/auth.service.spec.ts

describe('AuthService', () => {
  // Mock sab dependencies
  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();  // Har test ke baad mocks reset
  });

  it('duplicate email par ConflictException throw kare', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: '1' });  // Existing user

    await expect(
      service.register({ email: 'exists@test.com', password: '...' })
    ).rejects.toThrow(ConflictException);
  });
});
```

### Frontend Unit Tests

```typescript
// frontend/src/store/authSlice.test.ts
import authReducer, { setCredentials, logout } from './authSlice';

describe('authSlice', () => {
  const initialState = { user: null, accessToken: null, isAuthenticated: false };

  it('setCredentials se state update hoti hai', () => {
    const mockUser = { id: '1', email: 'test@test.com' };
    const state = authReducer(
      initialState,
      setCredentials({ user: mockUser, accessToken: 'token', refreshToken: 'refresh' })
    );

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('token');
  });

  it('logout se state clear hoti hai', () => {
    const loggedInState = {
      user: { id: '1', email: 'test@test.com' },
      accessToken: 'token',
      isAuthenticated: true,
    };

    const state = authReducer(loggedInState, logout());

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
```

---

## 2. Integration Tests (Supertest)

Real HTTP requests actual running NestJS app se. Real DB aur Redis chahiye.

### Backend Integration Tests

```typescript
// backend/test/integration/auth.e2e-spec.ts

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],  // REAL app module
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same setup as main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /register → 201 with tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
  });
});
```

### Test Database Setup

```typescript
// jest.config.ts
module.exports = {
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

```json
// backend/.env.test
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=pms_test  ← Separate test DB
DB_USERNAME=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-jwt-secret-32-chars-minimum!!
JWT_REFRESH_SECRET=test-refresh-secret-32-chars!!
```

---

## 3. E2E Tests (Playwright)

Real browser mein full user flow test karta hai.

### Test Structure

```
frontend/e2e/
├── auth.spec.ts       ← Login, register, validation
├── projects.spec.ts   ← Project CRUD
├── dashboard.spec.ts  ← Dashboard navigation
└── global-setup.ts    ← One-time auth state setup
```

### Auth State Setup (Once)

```typescript
// global-setup.ts — Sab tests se pehle ek baar run hota hai
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Register a test user
  await page.goto(`${baseURL}/register`);
  await page.fill('input[name="firstName"]', 'E2E');
  await page.fill('input[name="lastName"]', 'User');
  await page.fill('input[name="email"]', `e2e-${Date.now()}@test.com`);
  await page.fill('input[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);

  // Auth state save karo
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
  await browser.close();
}
```

### Test File Example

```typescript
// projects.spec.ts
test.describe('Projects (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });  // Pre-authenticated

  test('project create aur list mein dikhta hai', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project name/i).fill('My Test Project');
    await page.getByRole('button', { name: /create project/i }).click();

    // Verify project appears in list
    await expect(page.getByText('My Test Project')).toBeVisible({ timeout: 10000 });
  });
});
```

---

## Running Tests

### Backend Unit Tests

```bash
cd backend

# Sab tests run karo
npm test

# Watch mode (development ke liye)
npm run test:watch

# Coverage report
npm run test:cov

# Specific file
npm test -- auth.service.spec.ts

# Specific test
npm test -- --testNamePattern="should throw ConflictException"
```

### Backend Integration Tests

```bash
cd backend

# Test DB setup (ek baar)
createdb pms_test
npm run migration:run -- --env test

# Integration tests run karo
npm run test:e2e

# Specific test file
npm run test:e2e -- auth.e2e-spec.ts
```

### Frontend E2E Tests

```bash
cd frontend

# Playwright browsers install karo (ek baar)
npx playwright install

# App start karo (different terminal)
npm run dev

# Tests run karo
npm run test:e2e

# UI mode (interactive debugging)
npm run test:e2e:ui

# Specific browser
npx playwright test --project=chromium

# Debug mode (headed browser)
npx playwright test --debug

# Specific file
npx playwright test auth.spec.ts
```

---

## CI/CD mein Tests

```yaml
# .github/workflows/ci.yml excerpt

backend-lint-test:
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: pms_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
    redis:
      image: redis:7-alpine

  steps:
    - name: Backend unit tests
      run: npm test -- --coverage

    - name: Backend integration tests
      run: npm run test:e2e
      env:
        DB_HOST: localhost
        DB_DATABASE: pms_test
        REDIS_HOST: localhost

frontend-e2e:
  steps:
    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        BASE_URL: http://localhost:5173
        CI: true  # No interactive prompts, retry 2x
```

---

## Coverage Goals

| Layer | Target | Focus Areas |
|-------|--------|-------------|
| Auth Service | 90%+ | Register, login, refresh, logout |
| Projects Service | 85%+ | CRUD, cache behavior, RBAC |
| Tasks Service | 85%+ | CRUD, RBAC, queue |
| Organizations | 80%+ | CRUD, membership |
| Guards | 90%+ | JwtAuthGuard, RolesGuard |
| Frontend Slices | 95%+ | All Redux reducers |

---

## Test Best Practices

### Backend

1. **Har test independent ho** — `beforeEach` mein mocks reset karo
2. **Test behavior, not implementation** — Internal details change hone par bhi tests pass hone chahiye
3. **Integration tests mein real DB use karo** — Mocked DB se production bugs miss ho jaate hain
4. **Edge cases test karo** — Empty arrays, null values, boundary conditions

### Frontend (E2E)

1. **Page Object Model use karo** (large apps ke liye)
2. **Flaky tests avoid karo** — `waitForSelector`, timeout properly set karo
3. **Auth state setup once** — `globalSetup` mein, har test mein login mat karo
4. **Data-testid attributes use karo** — CSS changes se tests break nahi hoge

```typescript
// Better: data-testid
await page.getByTestId('create-project-btn').click();

// Fragile: CSS selector
await page.locator('.btn-primary.create').click();  // CSS change → test breaks
```
