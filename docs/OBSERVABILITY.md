# Observability — Hindlish mein

## Teen Pillars of Observability

```
LOGS           → Kya hua? (What happened?)
METRICS        → Kitna hua? (How much/how often?)
TRACES         → Kab aur kahan hua? (When and where?)
```

---

## 1. Structured Logging (Winston)

### Configuration

```typescript
// app.module.ts
WinstonModule.forRoot({
  transports: [
    // Console mein human-readable format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) =>
          `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
        ),
      ),
    }),

    // File mein JSON format (machine-readable)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
}),
```

### Log Format

```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "url": "/api/v1/organizations/org-uuid/projects",
  "statusCode": 201,
  "duration": "47ms",
  "userId": "user-uuid",
  "orgId": "org-uuid",
  "message": "POST /api/v1/organizations/org-uuid/projects 201 47ms"
}
```

### Logging Interceptor

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: WinstonLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, headers, user } = req;
    const correlationId = headers['x-correlation-id'];
    const start = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;

        this.logger.log({
          level: 'info',
          message: `${method} ${url} ${response.statusCode} ${duration}ms`,
          correlationId,
          method,
          url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          userId: user?.id,
        });
      }),

      catchError((error) => {
        const duration = Date.now() - start;
        this.logger.error({
          message: `${method} ${url} ERROR ${duration}ms: ${error.message}`,
          correlationId,
          duration: `${duration}ms`,
          userId: req.user?.id,
          stack: error.stack,
        });
        throw error;
      }),
    );
  }
}
```

---

## 2. OpenTelemetry (Distributed Tracing)

### Setup

```typescript
// tracing.ts — main.ts se PEHLE import karo
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'project-management-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    environment: process.env.NODE_ENV,
  }),

  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },  // DB queries trace
      '@opentelemetry/instrumentation-redis': { enabled: true }, // Redis trace
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

### Trace Example (Production mein automatically generated)

```
Trace: POST /api/v1/organizations/org-1/projects (47ms total)
├── JwtStrategy.validate (2ms)
├── RolesGuard.canActivate (5ms)
│   └── SELECT memberships WHERE... (3ms) [pg query]
├── ProjectsService.create (35ms)
│   ├── Redis GET projects:org-1 (1ms) [cache miss]
│   ├── INSERT INTO projects... (8ms) [pg query]
│   ├── Redis DEL projects:org-1 (1ms)
│   └── BullMQ.add project-created (2ms)
└── TransformInterceptor (0ms)
```

---

## 3. Prometheus Metrics

### Metrics Endpoint Setup

```typescript
// main.ts
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });  // Node.js default metrics

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Metrics endpoint
app.getHttpAdapter().get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_ms_p99` | 99th percentile latency | > 500ms |
| `http_requests_total` | Request rate | Sudden spike |
| `http_error_rate` | 5xx error percentage | > 1% |
| `nodejs_heap_space_size_used` | Memory usage | > 512MB |
| `bullmq_jobs_failed_total` | Failed queue jobs | Any |
| `pg_pool_connections` | DB connection pool | Near max |
| `redis_connected_clients` | Redis connections | Near max |

---

## 4. Correlation ID

Har request ko unique ID milta hai — logs mein trace karna aasaan:

```typescript
// correlation-id.middleware.ts
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      req.headers['x-correlation-id'] as string ||
      uuidv4();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

Frontend se correlation ID bhejo (debugging ke liye):

```typescript
// apiClient.ts request interceptor
axiosInstance.interceptors.request.use(config => {
  config.headers['x-correlation-id'] = `fe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return config;
});
```

---

## 5. Health Check

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgresql'),
      () => this.redis.pingCheck('redis', {
        transport: Transport.REDIS,
        options: { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT },
      }),
    ]);
  }
}
```

Response:
```json
{
  "status": "ok",
  "info": {
    "postgresql": { "status": "up" },
    "redis": { "status": "up" }
  },
  "details": {
    "postgresql": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

## 6. Grafana Dashboard (Production)

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards

  jaeger:
    image: jaegertracing/all-in-one
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nestjs-api'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: /metrics
```

### Key Grafana Panels

1. **Request Rate** — Requests per second by endpoint
2. **Error Rate** — 4xx/5xx percentage
3. **Latency P50/P95/P99** — Response time percentiles
4. **Active Users** — WebSocket connections (Redis presence count)
5. **Queue Depth** — BullMQ pending jobs
6. **Cache Hit Rate** — Redis hits vs misses
7. **DB Connections** — Pool utilization
