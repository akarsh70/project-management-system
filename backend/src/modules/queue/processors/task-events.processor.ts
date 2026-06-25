import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../../database/entities';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Processor('task-events')
export class TaskEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskEventsProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly wsGateway: WebsocketGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing task job: ${job.name} [${job.id}]`);

    if (job.name === 'task-assigned') {
      const { assignedTo, orgId, taskId, taskTitle, projectId } = job.data;

      if (assignedTo) {
        const notification = await this.notificationRepository.save(
          this.notificationRepository.create({
            userId: assignedTo,
            organizationId: orgId,
            type: NotificationType.TASK_ASSIGNED,
            title: 'Task Assigned to You',
            message: `You have been assigned to task: "${taskTitle}"`,
            data: { taskId, projectId },
          }),
        );

        // Real-time broadcast to org room — frontend picks it up via socket 'notification_new'
        this.wsGateway.broadcastToOrg(orgId, 'notification_new', notification);
        this.logger.log(`Notification broadcast to org:${orgId} for user ${assignedTo}`);
      }
    }

    this.logger.log(`Task job completed: ${job.name} [${job.id}]`);
  }
}
