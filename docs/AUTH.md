# Authentication & Authorization — Hindlish mein

## Overview

**JWT-based stateless authentication** implement ki hai with:
- Access tokens (15 min) — API calls ke liye
- Refresh tokens (7 days, DB-stored) — Silent renewal ke liye
- Token rotation — Security ke liye
- Passport.js strategy pattern — SSO-ready architecture

---

## Authentication Flow

### 1. Registration / Login

```
Client → POST /api/v1/auth/register OR /auth/login
                    │
                    ▼
           AuthService.register() / .login()
                    │
           ┌────────▼────────┐
           │  Find user by   │
           │  email in DB    │
           └────────┬────────┘
                    │
           ┌────────▼────────────────┐
           │  bcrypt.compare(        │
           │    plainPassword,       │
           │    storedHash           │
           │  )                      │
           └────────┬────────────────┘
                    │ ✅ Match
           ┌────────▼────────────────┐
           │  jwt.signAsync({        │
           │    sub: userId,         │
           │    email: user.email    │
           │  }, secret, '15m')      │
           │  → accessToken          │
           └────────┬────────────────┘
                    │
           ┌────────▼────────────────┐
           │  crypto.randomBytes()   │
           │  → rawRefreshToken      │
           │  sha256(raw) → hash     │
           │  Save hash in DB        │
           │  (NOT raw token)        │
           └────────┬────────────────┘
                    │
                    ▼
           Response: {
             accessToken,    ← Short-lived (15m)
             refreshToken,   ← Raw token (hash in DB)
             user: { id, email, ... }  ← No passwordHash!
           }
```

### 2. Authenticated Request

```
Client → GET /api/v1/auth/me
         Header: Authorization: Bearer <accessToken>
                    │
                    ▼
           JwtAuthGuard
                    │
           ┌────────▼────────────────┐
           │  JwtStrategy.validate() │
           │  jwt.verify(token, secret)│
           │  → { sub: userId }      │
           │  userRepository.findOne(userId)│
           └────────┬────────────────┘
                    │ User found + isActive
                    ▼
           Request.user = user
                    │
                    ▼
           Controller → Response
```

### 3. Token Refresh

```
Client → POST /api/v1/auth/refresh
         Body: { refreshToken: "<raw-token>" }
                    │
                    ▼
           sha256(rawToken) → searchHash
                    │
           ┌────────▼────────────────────────┐
           │  DB: SELECT WHERE               │
           │    token_hash = searchHash      │
           │    AND is_revoked = false       │
           │    AND expires_at > NOW()       │
           └────────┬────────────────────────┘
                    │ Record found ✅
           ┌────────▼────────────────┐
           │  OLD token REVOKE karo  │
           │  UPDATE SET             │
           │    is_revoked = true    │
           └────────┬────────────────┘
                    │
           ┌────────▼────────────────┐
           │  New tokens generate    │
           │  + save new hash in DB  │
           └────────┬────────────────┘
                    │
                    ▼
           Response: {
             accessToken: <new>,
             refreshToken: <new>
           }
```

**Token Rotation kyun zaruri hai:**
Agar refresh token steal ho jaye aur attacker use kare, original user ka next refresh attempt fail hoga (hash mismatch) → Security breach detect ho jaata hai.

### 4. Logout

```
Client → POST /api/v1/auth/logout
         Header: Authorization: Bearer <accessToken>
                    │
                    ▼
           UPDATE refresh_tokens
           SET is_revoked = true
           WHERE user_id = :userId
             AND is_revoked = false
```

Logout par sare devices ke refresh tokens revoke ho jaate hain (full logout).

---

## Passport.js Strategies

### 1. LocalStrategy (email/password)

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

`POST /auth/login` route par `@UseGuards(LocalAuthGuard)` lagta hai.

### 2. JwtStrategy (Bearer token)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

---

## Guards

### JwtAuthGuard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // @Public() decorator wali routes skip karo
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

`@Public()` decorator se routes bypass ho jaati hain (e.g., `/health`, `/auth/register`).

### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<MemberRole[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true; // No role requirement

    const { user, headers } = context.switchToHttp().getRequest();
    const orgId = headers['x-organization-id'];

    // DB se membership check karo
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, organizationId: orgId, isActive: true },
    });

    if (!membership) throw new ForbiddenException('Not a member of this organization');

    // Role hierarchy check: ADMIN=3, EDITOR=2, VIEWER=1
    const roleHierarchy = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };
    const userLevel = roleHierarchy[membership.role];
    const requiredLevel = Math.min(...requiredRoles.map(r => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(`Required role: ${requiredRoles.join(' or ')}`);
    }

    // Membership request par attach karo (services use karein)
    request.currentMembership = membership;
    return true;
  }
}
```

---

## SSO-Ready Architecture

### SAML Integration (Steps)

```bash
npm install passport-saml @types/passport-saml
```

```typescript
// backend/src/modules/auth/strategies/saml.strategy.ts
@Injectable()
export class SamlStrategy extends PassportStrategy(SamlPassport, 'saml') {
  constructor(private authService: AuthService) {
    super({
      entryPoint: process.env.SAML_ENTRY_POINT,     // IdP SSO URL
      issuer: process.env.SAML_ISSUER,              // Our app's entity ID
      cert: process.env.SAML_CERT,                  // IdP public certificate
      callbackUrl: process.env.SAML_CALLBACK_URL,
    });
  }

  async validate(profile: SamlProfile) {
    return this.authService.findOrCreateFromSSO({
      provider: 'saml',
      email: profile.nameID,
      firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
      lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
    });
  }
}

// Auth module mein register karo:
// providers: [...existingProviders, SamlStrategy]

// Controller endpoints:
@Get('saml')
@UseGuards(AuthGuard('saml'))
samlLogin() {}  // Redirects to IdP

@Post('saml/callback')
@UseGuards(AuthGuard('saml'))
samlCallback(@CurrentUser() user: User) {
  return this.authService.generateTokens(user);
}
```

### OIDC Integration (Steps)

```bash
npm install passport-openidconnect
```

Similar pattern — sirf `openidconnect` strategy implement karo.

### Google OAuth Integration (Steps)

```bash
npm install passport-google-oauth20 @types/passport-google-oauth20
```

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(GoogleOAuth, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: GoogleProfile) {
    return this.authService.findOrCreateFromOAuth({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      avatarUrl: profile.photos[0]?.value,
    });
  }
}
```

**Existing code mein koi change nahi** — sirf naya strategy add karo! Ye PassportJS ka beauty hai.

---

## Security Best Practices

| Practice | Implementation |
|----------|----------------|
| Password hashing | bcrypt rounds=12 |
| Refresh token storage | SHA-256 hash in DB (raw token never stored) |
| Token rotation | Every refresh invalidates old token |
| Short access token | 15 minutes expiry |
| HTTPS only | Nginx SSL termination |
| Secure headers | Helmet.js middleware |
| Rate limiting | Auth endpoints: 10 req/min |
| Input validation | class-validator DTOs |
