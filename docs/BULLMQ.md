# BullMQ Queue Architecture — Hindlish mein

## Kyun Queue Use Karna?

Kuch operations synchronous request mein karne ki zaroorat nahi:

```
Without Queue (slow):
  POST /projects → Save project → Send 50 notifications → Save audit log
  Response time: ~300ms + 50 * 20ms = ~1300ms 😭

With Queue (fast):
  POST /projects → Save project → Queue job → Return response
  Response time: ~50ms ⚡
  (Notifications + Audit log happen in background)
```

---

## Queue Architecture

```
NestJS API (Producer)
       │
       ├── project-events queue ──────────► ProjectEventsProcessor
       │        │                                    │
       │        └── project-created job              └── Create notifications for all members
       │            project-updated job
       │
       ├── task-events queue ─────────────► TaskEventsProcessor
       │        │                                    │
       │        └── task-assigned job               └── Create notification for assignee
       │            task-updated job
       │
       ├── notifications queue ───────────► NotificationProcessor (future)
       │        │                                    │
       │        └── send-email job                  └── Send email via SMTP/SES
       │            push-notification job
       │
       └── audit-logs queue ──────────────► AuditLogProcessor
                │                                    │
                └── audit-log job                   └── Save to audit_logs table

All queues backed by Redis 7
```

---

## Queue Configuration

```typescript
// app.module.ts
BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('redis.host'),
      port: configService.get('redis.port'),
      password: configService.get('redis.password'),
    },
    defaultJobOptions: {
      attempts: 3,             // 3 baar retry karo
      backoff: {
        type: 'exponential',   // 1s, 2s, 4s delay
        delay: 1000,
      },
      removeOnComplete: 100,   // Last 100 completed jobs rakhon
      removeOnFail: 500,       // Last 500 failed jobs rakhon (debug ke liye)
    },
  }),
  inject: [ConfigService],
}),

BullModule.registerQueue(
  { name: 'project-events' },
  { name: 'task-events' },
  { name: 'notifications' },
  { name: 'audit-logs' },
),
```

---

## Processors

### 1. Project Events Processor

```typescript
@Processor('project-events')
export class ProjectEventsProcessor {
  @Process('project-created')
  async handleProjectCreated(job: Job<ProjectEventData>) {
    const { projectId, orgId, createdBy } = job.data;

    // Org ke saare active members fetch karo
    const members = await this.membershipRepository.find({
      where: { organizationId: orgId, isActive: true },
      relations: ['user'],
    });

    // Har member ko notification create karo
    // Creator ko nahi (usne hi banaya hai)
    const notifications = members
      .filter(m => m.userId !== createdBy)
      .map(m =>
        this.notificationRepository.create({
          userId: m.userId,
          organizationId: orgId,
          type: 'PROJECT_CREATED',
          title: 'New Project Created',
          message: `A new project has been created in your organization`,
          data: { projectId },
        }),
      );

    await this.notificationRepository.save(notifications);

    // WebSocket via gateway broadcast
    this.websocketGateway.broadcastToOrg(orgId, 'project_created', { projectId });
  }

  @Process('project-updated')
  async handleProjectUpdated(job: Job<ProjectEventData>) {
    // Similar to above but with different notification text
  }
}
```

### 2. Task Events Processor

```typescript
@Processor('task-events')
export class TaskEventsProcessor {
  @Process('task-assigned')
  async handleTaskAssigned(job: Job<TaskEventData>) {
    const { taskId, orgId, assignedTo, title } = job.data;

    if (!assignedTo) return; // Unassigned task

    // Sirf assignee ko notify karo
    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: assignedTo,
        organizationId: orgId,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned to You',
        message: `You have been assigned task: "${title}"`,
        data: { taskId },
      }),
    );
  }
}
```

### 3. Audit Log Processor

```typescript
@Processor('audit-logs')
export class AuditLogProcessor {
  @Process('audit-log')
  async handleAuditLog(job: Job<AuditLogData>) {
    await this.auditLogRepository.save(
      this.auditLogRepository.create(job.data),
    );
  }
}
```

---

## Job Adding (Producer side)

```typescript
// projects.service.ts
async create(orgId: string, dto: CreateProjectDto, userId: string) {
  const project = await this.projectRepository.save(...);

  // Queue mein job daalo (non-blocking)
  await this.projectEventsQueue.add('project-created', {
    projectId: project.id,
    orgId,
    createdBy: userId,
    projectName: project.name,
  });

  // Audit log queue
  await this.auditLogsQueue.add('audit-log', {
    userId,
    organizationId: orgId,
    action: 'PROJECT_CREATED',
    resourceType: 'project',
    resourceId: project.id,
    newValues: { name: project.name, status: project.status },
  });

  return project;
}
```

---

## Retry Logic

```typescript
// Job options with retry
await this.queue.add('job-name', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,  // 2s, 4s, 8s
  },
});

// Custom retry per job type
await this.emailQueue.add('send-email', emailData, {
  attempts: 5,         // Email ke liye zyada tries
  backoff: {
    type: 'fixed',
    delay: 5000,       // Har 5 seconds
  },
  timeout: 30000,      // 30s per attempt
});
```

---

## Dead Letter Queue (DLQ)

Jobs jo sab retries ke baad bhi fail ho jaate hain, BullMQ mein `failed` state mein chale jaate hain.

```typescript
// Failed jobs ki monitoring
const failedJobs = await this.queue.getFailed();
console.log(`Failed jobs: ${failedJobs.length}`);

// Failed job retry karo
await failedJob.retry();

// Failed jobs ko DLQ mein move karo (manual review)
@OnQueueFailed()
async onFailed(job: Job, error: Error) {
  this.logger.error(`Job ${job.id} failed: ${error.message}`, {
    jobName: job.name,
    data: job.data,
    attempts: job.attemptsMade,
  });

  if (job.attemptsMade >= job.opts.attempts) {
    // Alert: Max retries exceeded
    this.alertService.notify(`Critical job failed: ${job.name}`);
  }
}
```

---

## Bull Board (UI Dashboard)

Development mein queue monitor karne ke liye:

```typescript
// main.ts mein add karo
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(projectEventsQueue),
    new BullMQAdapter(taskEventsQueue),
    new BullMQAdapter(auditLogsQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
// → http://localhost:3000/admin/queues
```

---

## Queue vs Direct DB Write Decision

| Scenario | Queue? | Reasoning |
|----------|--------|-----------|
| Notifications (50+ members) | ✅ YES | User ko wait nahi karwana |
| Audit logs | ✅ YES | Non-critical, async fine |
| Email/SMS sending | ✅ YES | External service, slow |
| Cache invalidation | ❌ NO | Must be immediate |
| DB save (main entity) | ❌ NO | Must be in same transaction |
| Response data calculation | ❌ NO | User ko data chahiye |

**Rule:** Agar user ko result ka intezaar nahi karna, queue use karo.
