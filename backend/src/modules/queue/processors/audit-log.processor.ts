import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../../database/entities';

@Processor('audit-logs')
export class AuditLogProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogProcessor.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, orgId, action, resourceType, resourceId, oldValues, newValues, ip, userAgent } = job.data;

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId,
        organizationId: orgId,
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues,
        ipAddress: ip,
        userAgent,
      }),
    );

    this.logger.debug(`Audit log saved: ${action} on ${resourceType}:${resourceId}`);
  }
}
