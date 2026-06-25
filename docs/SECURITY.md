# Security Documentation — Hindlish mein

## Security Layers

```
Browser
  │
  ├── HTTPS (TLS)              ← Transport encryption
  │
  ▼
Nginx
  │
  ├── Rate Limiting             ← DDoS protection
  ├── Security Headers          ← XSS, clickjacking, etc.
  ├── CORS                      ← Origin control
  │
  ▼
NestJS
  │
  ├── Helmet.js                 ← Security headers
  ├── ThrottlerGuard            ← Application rate limiting
  ├── ValidationPipe            ← Input sanitization
  ├── JwtAuthGuard              ← Authentication
  ├── RolesGuard                ← Authorization
  │
  ▼
PostgreSQL
  │
  └── RLS (Optional)            ← Database isolation
```

---

## 1. Password Security (bcrypt)

```typescript
// Registration — password hash karo
const saltRounds = 12;  // Deliberately slow for brute force protection
const passwordHash = await bcrypt.hash(dto.password, saltRounds);

// Login — verify karo
const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

**Kyun bcrypt:**
- Intentionally slow — brute force attacks expensive
- Built-in salt (rainbow table protection)
- `saltRounds: 12` = ~250ms per comparison (reasonable UX, hard to brute force)

**NEVER store:**
- Plain text passwords
- MD5/SHA1 hashes (fast, rainbow table vulnerable)

---

## 2. JWT Security

### Access Token

```typescript
// Short expiry — stolen token ka window kam
await this.jwtService.signAsync(
  { sub: user.id, email: user.email },
  { secret: process.env.JWT_SECRET, expiresIn: '15m' }
);
```

### Refresh Token

```typescript
// Raw token generate
const rawToken = crypto.randomUUID() + crypto.randomBytes(32).toString('hex');

// ONLY HASH store in DB (never raw token)
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

await refreshTokenRepository.save({
  userId: user.id,
  tokenHash,                     // ← DB mein hash store
  expiresAt: addDays(new Date(), 7),
});

// Client ko raw token bhejo
return { refreshToken: rawToken };
```

**Kyun hash store:**
Agar DB compromise ho, attacker refresh tokens directly use nahi kar sakta.

### JWT Secret Requirements

```env
# Production mein: minimum 64 random characters
JWT_SECRET=your-secret-min-64-chars-use-openssl-rand-base64-64-here
JWT_REFRESH_SECRET=different-secret-min-64-chars-never-same-as-above
```

```bash
# Generate strong secrets
openssl rand -base64 64
```

---

## 3. Input Validation

```typescript
// DTO validation — NestJS class-validator
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => value.trim())  // Trim whitespace
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

// Global ValidationPipe configuration
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,         // Extra fields automatically remove hote hain
    forbidNonWhitelisted: true, // Unknown fields par 400 error
    transform: true,         // Types auto-convert hote hain (string → number)
    stopAtFirstError: false, // Sab errors ek saath batao
  }),
);
```

---

## 4. Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // Socket.IO ke liye
}));
```

Headers added automatically:

| Header | Value | Protection |
|--------|-------|------------|
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `Content-Security-Policy` | (configured above) | XSS, injection |

---

## 5. Rate Limiting

### Application Level (NestJS Throttler)

```typescript
// Global limit
ThrottlerModule.forRootAsync({
  useFactory: (config: ConfigService) => [{
    ttl: config.get('app.throttleTtl') * 1000,  // 60 seconds
    limit: config.get('app.throttleLimit'),       // 100 requests
  }],
}),

// Auth endpoints — stricter
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Post('login')
login() {}
```

### Nginx Level (DDoS Protection)

```nginx
# Nginx rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Apply
location /api/ {
  limit_req zone=api burst=20 nodelay;
}
location /api/v1/auth/ {
  limit_req zone=auth burst=5 nodelay;
}
```

---

## 6. CORS Configuration

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
  credentials: true,
  maxAge: 86400,  // 24 hours preflight cache
});
```

---

## 7. SQL Injection Prevention

TypeORM parameterized queries use karta hai — SQL injection possible nahi:

```typescript
// ✅ Safe — TypeORM parameterized query
const users = await this.userRepository.find({
  where: { email: userInput },  // Automatically sanitized
});

// ✅ Safe — Query builder with parameters
const result = await this.projectRepository
  .createQueryBuilder('project')
  .where('project.name ILIKE :search', { search: `%${userInput}%` })
  .getMany();

// ❌ NEVER do raw string interpolation
const result = await this.dataSource.query(
  `SELECT * FROM users WHERE email = '${userInput}'`  // SQL Injection risk!
);
```

---

## 8. SAML/OIDC SSO Integration

### SAML Setup Steps

```bash
npm install passport-saml @types/passport-saml
```

```env
SAML_ENTRY_POINT=https://idp.company.com/sso/saml
SAML_ISSUER=https://yourapp.com
SAML_CERT=-----BEGIN CERTIFICATE-----...
SAML_CALLBACK_URL=https://yourapp.com/api/v1/auth/saml/callback
```

```typescript
// SamlStrategy — sirf strategy add karo, baaki same
@Injectable()
export class SamlStrategy extends PassportStrategy(SamlPassport, 'saml') {
  constructor(configService: ConfigService, authService: AuthService) {
    super({
      entryPoint: configService.get('SAML_ENTRY_POINT'),
      issuer: configService.get('SAML_ISSUER'),
      cert: configService.get('SAML_CERT'),
      callbackUrl: configService.get('SAML_CALLBACK_URL'),
      privateKey: configService.get('SAML_PRIVATE_KEY'),  // Request signing
      signatureAlgorithm: 'sha256',
      wantAuthnResponseSigned: true,
    });
  }

  async validate(profile: SamlProfile): Promise<User> {
    return this.authService.findOrCreateFromSSO({
      provider: 'saml',
      providerId: profile.nameID,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
  }
}
```

### OIDC Setup Steps

```bash
npm install passport-openidconnect
```

Similar pattern — `OidcStrategy` class.

---

## 9. Secrets Management: Vault / AWS KMS

### Development: .env file

```env
JWT_SECRET=dev-secret-change-in-production
DB_PASSWORD=local-dev-password
```

### Staging/Production: HashiCorp Vault

```typescript
// config/vault.config.ts
import * as vault from 'node-vault';

export async function loadSecretsFromVault(): Promise<void> {
  const client = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });

  const secret = await client.read('secret/data/project-management/production');

  process.env.JWT_SECRET = secret.data.data.jwt_secret;
  process.env.JWT_REFRESH_SECRET = secret.data.data.jwt_refresh_secret;
  process.env.DB_PASSWORD = secret.data.data.db_password;
  process.env.REDIS_PASSWORD = secret.data.data.redis_password;
}

// main.ts mein NestJS init se PEHLE call karo
await loadSecretsFromVault();
const app = await NestFactory.create(AppModule);
```

### Production: AWS KMS + Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function loadSecretsFromAWS(): Promise<void> {
  const client = new SecretsManagerClient({ region: 'ap-south-1' });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'project-management/production' })
  );

  const secrets = JSON.parse(response.SecretString);

  process.env.JWT_SECRET = secrets.jwtSecret;
  process.env.DB_PASSWORD = secrets.dbPassword;
  process.env.REDIS_PASSWORD = secrets.redisPassword;
}
```

### Google Cloud Secret Manager

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/my-project/secrets/jwt-secret/versions/latest',
});
process.env.JWT_SECRET = version.payload.data.toString();
```

---

## Security Checklist

### Development
- [x] bcrypt password hashing (rounds: 12)
- [x] JWT short expiry (15 min)
- [x] Refresh token hashing (SHA-256)
- [x] Input validation (class-validator)
- [x] SQL injection prevention (TypeORM parameterized)
- [x] XSS protection (helmet CSP)
- [x] Rate limiting (throttler + nginx)
- [x] CORS configuration
- [x] Tenant isolation (RolesGuard)

### Production (Additional)
- [ ] HTTPS/TLS certificate
- [ ] Secrets from Vault/KMS (not .env)
- [ ] PostgreSQL RLS enabled
- [ ] Database encrypted at rest
- [ ] Redis password + TLS
- [ ] Audit logging all sensitive actions
- [ ] DDoS protection (CloudFlare/AWS WAF)
- [ ] Regular dependency updates
- [ ] Penetration testing
