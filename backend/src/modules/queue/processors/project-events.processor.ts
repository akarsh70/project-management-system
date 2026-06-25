import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, Notification, NotificationType } from '../../../database/entities';

@Processor('project-events')
export class ProjectEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProjectEventsProcessor.name);

  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} [${job.id}]`);

    if (job.name === 'project-created' || job.name === 'project-updated') {
      const { orgId, userId, projectId, projectName, type } = job.data;

      const members = await this.membershipRepository.find({
        where: { organizationId: orgId, isActive: true },
      });

      const notifications = members
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notificationRepository.create({
            userId: m.userId,
            organizationId: orgId,
            type: type === 'created' ? NotificationType.PROJECT_CREATED : NotificationType.PROJECT_UPDATED,
            title: type === 'created' ? 'New Project Created' : 'Project Updated',
            message: type === 'created'
              ? `A new project "${projectName}" has been created.`
              : `Project "${projectName}" has been updated.`,
            data: { projectId },
          }),
        );

      if (notifications.length > 0) {
        await this.notificationRepository.save(notifications);
      }
    }

    this.logger.log(`Job completed: ${job.name} [${job.id}]`);
  }
}
