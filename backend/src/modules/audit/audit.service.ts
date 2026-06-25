import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities';

export interface AuditLogInput {
  userId?: string;
  orgId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectQueue('audit-logs')
    private auditQueue: Queue,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.auditQueue.add('log', input, { priority: 10 });
  }

  async findByOrg(orgId: string, page = 1, limit = 50) {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
    return { logs, total, page, limit };
  }

  async findByResource(resourceType: string, resourceId: string) {
    return this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
