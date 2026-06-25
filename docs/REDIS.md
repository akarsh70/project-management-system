# Redis Caching Strategy — Hindlish mein

## Overview

Redis 7 teen purposes ke liye use ho raha hai:

| Purpose | Implementation |
|---------|----------------|
| **Application Cache** | Project lists + org data cache |
| **WebSocket Presence** | Online users track karna |
| **BullMQ Backend** | Job queues ki backing store |

---

## Cache Strategy: Cache-Aside Pattern

```
Request aaya
     │
     ▼
Redis GET(key)
     │
     ├── HIT  → Data return karo ⚡ (fast)
     │
     └── MISS → DB query karo
                    │
                    ▼
              Redis SET(key, data, TTL)
                    │
                    ▼
              Data return karo
```

**Code Implementation:**

```typescript
// projects.service.ts
async findAll(orgId: string): Promise<Project[]> {
  const cacheKey = `projects:${orgId}`;

  // Step 1: Cache check
  const cached = await this.redisService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);  // ⚡ Redis hit — no DB
  }

  // Step 2: Cache miss → DB query
  const projects = await this.projectRepository.find({
    where: { organizationId: orgId, status: Not(ProjectStatus.DELETED) },
    order: { createdAt: 'DESC' },
  });

  // Step 3: Cache store (300 seconds = 5 minutes)
  await this.redisService.set(cacheKey, JSON.stringify(projects), 300);

  return projects;
}
```

---

## Cache Keys

| Key Pattern | Type | TTL | Data |
|-------------|------|-----|------|
| `projects:{orgId}` | String (JSON) | 300s | Array of projects |
| `orgs:{orgId}` | String (JSON) | 3600s | Organization details |
| `presence` | Hash | No TTL | userId → socketId |

### Key Naming Convention

```
service:entity:identifier

Examples:
  projects:org-uuid-123         → Org ke sab projects
  orgs:org-uuid-123             → Org details
  tasks:project-uuid-456        → Project ke sab tasks (future)
```

---

## Cache Invalidation

**Jab bhi data change ho, cache delete karo:**

```typescript
async create(orgId: string, dto: CreateProjectDto, userId: string) {
  const project = await this.projectRepository.save(
    this.projectRepository.create({ ...dto, organizationId: orgId, createdBy: userId }),
  );

  // ⭐ Cache invalidate karo
  await this.redisService.del(`projects:${orgId}`);

  return project;
}

async update(orgId: string, id: string, dto: UpdateProjectDto, ...) {
  // ... update logic ...

  // Cache invalidate
  await this.redisService.del(`projects:${orgId}`);

  return updated;
}

async remove(orgId: string, id: string, ...) {
  // ... delete logic ...

  // Cache invalidate
  await this.redisService.del(`projects:${orgId}`);
}
```

### Pattern Delete (Future Use)

Agar kai related keys invalidate karne hon:

```typescript
// Org ke saare caches clear karo
await this.redisService.delPattern(`*:${orgId}:*`);
// Matches: projects:org-123, tasks:org-123, etc.
```

---

## TTL Decisions

| Cache | TTL | Reasoning |
|-------|-----|-----------|
| Projects list | 300s (5min) | Frequently read, reasonable staleness acceptable |
| Organization | 3600s (1hr) | Org settings bahut rarely change hoti hain |
| User sessions | N/A (JWT) | Stateless auth, no session cache needed |
| Rate limits | 60s | Throttler managed internally |
| Task list | No cache | Tasks frequently update hoti hain (real-time needed) |

**Tasks cache kyun nahi:**
Tasks Kanban board par real-time update hoti hain. Cache staleness acceptable nahi. Tasks ke liye real-time Socket.IO events use karte hain.

---

## RedisService Wrapper

Pure ioredis use karne ki jagah ek wrapper banaya hai:

```typescript
@Injectable()
export class RedisService {
  private client: Redis;

  constructor(@Inject(REDIS_CLIENT) client: Redis) {
    this.client = client;
  }

  // String operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Hash operations (presence tracking ke liye)
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  // Utility
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

**Wrapper kyun:**
- Direct ioredis replace karna aasaan (e.g., cluster, sentinel)
- Error handling centralize kar sakte hain
- Testing mein mock karna easy

---

## Presence Tracking

```typescript
// User connect hota hai
async handleConnection(client: Socket) {
  const userId = extractUserIdFromToken(client.handshake.auth.token);
  await this.redisService.hset('presence', userId, client.id);
}

// User disconnect hota hai
async handleDisconnect(client: Socket) {
  const userId = extractUserIdFromToken(client.handshake.auth.token);
  await this.redisService.hdel('presence', userId);
}

// Org ke online users
async getOnlineUsers(orgId: string): Promise<string[]> {
  const presence = await this.redisService.hgetall('presence');
  const orgRoom = this.server.sockets.adapter.rooms.get(`org:${orgId}`);

  return Object.entries(presence)
    .filter(([, socketId]) => orgRoom?.has(socketId))
    .map(([userId]) => userId);
}
```

```
Redis Hash: presence
┌──────────────────────────────────────────┐
│  Key: "presence"                          │
│  Field          │ Value                  │
│  ─────────────────────────────────────── │
│  user-uuid-1    │ socket-abc123          │
│  user-uuid-2    │ socket-def456          │
│  user-uuid-3    │ socket-ghi789          │
└──────────────────────────────────────────┘
```

---

## Monitoring

```bash
# Redis connection test
redis-cli -h localhost -p 6379 ping
# → PONG

# Cache keys dekho
redis-cli keys "projects:*"

# Specific key ka TTL
redis-cli ttl "projects:org-uuid-123"
# → 247 (seconds remaining)

# Key ki value
redis-cli get "projects:org-uuid-123"

# Presence hash
redis-cli hgetall presence

# Memory usage
redis-cli info memory | grep used_memory_human
# → used_memory_human:2.5M

# Cache hit/miss stats
redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"
# → keyspace_hits:15234
# → keyspace_misses:1023
# Hit rate = 15234/(15234+1023) = 93.7% ← Good!
```

---

## Production Configuration

```env
REDIS_HOST=redis-cluster.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=strong-redis-password
REDIS_TLS=true  # Production mein TLS enable karo

# Sentinel for HA
REDIS_SENTINEL_HOST=sentinel.production.internal
REDIS_SENTINEL_PORT=26379
REDIS_SENTINEL_NAME=mymaster
```

### Redis Cluster (High Availability)

Production mein Redis Sentinel ya Redis Cluster use karo:

```typescript
// redis.module.ts production config
const client = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
  tls: {},
});
```
