import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task, Membership, MemberRole, Notification, NotificationType } from '../../database/entities';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectQueue('task-events')
    private taskQueue: Queue,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  async create(orgId: string, projectId: string, dto: CreateTaskDto, userId: string): Promise<Task> {
    if (dto.assignedTo) {
      await this.verifyMembership(orgId, dto.assignedTo);
    }

    const task = await this.taskRepository.save(
      this.taskRepository.create({
        ...dto,
        projectId,
        organizationId: orgId,
        createdBy: userId,
      }),
    );

    if (dto.assignedTo) {
      await this.notifyAssignment(orgId, projectId, task.id, task.title, dto.assignedTo);
    }

    return task;
  }

  async findAll(orgId: string, projectId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { organizationId: orgId, projectId },
      relations: ['assignedToUser', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(orgId: string, projectId: string, id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, projectId, organizationId: orgId },
      relations: ['assignedToUser', 'createdByUser', 'project'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    orgId: string,
    projectId: string,
    id: string,
    dto: UpdateTaskDto,
    _userId: string,
    userRole: MemberRole,
  ): Promise<Task> {
    const task = await this.findOne(orgId, projectId, id);

    if (userRole === MemberRole.VIEWER) {
      throw new ForbiddenException('VIEWERs cannot update tasks');
    }

    if (dto.assignedTo && dto.assignedTo !== task.assignedTo) {
      await this.verifyMembership(orgId, dto.assignedTo);
      await this.notifyAssignment(orgId, projectId, id, task.title, dto.assignedTo);
    }

    Object.assign(task, dto);
    return this.taskRepository.save(task);
  }

  async remove(
    orgId: string,
    projectId: string,
    id: string,
    userId: string,
    userRole: MemberRole,
  ): Promise<void> {
    const task = await this.findOne(orgId, projectId, id);

    if (userRole === MemberRole.VIEWER) {
      throw new ForbiddenException('VIEWERs cannot delete tasks');
    }

    if (userRole === MemberRole.EDITOR && task.createdBy !== userId) {
      throw new ForbiddenException('EDITORs can only delete their own tasks');
    }

    await this.taskRepository.remove(task);
  }

  private async notifyAssignment(
    orgId: string,
    projectId: string,
    taskId: string,
    taskTitle: string,
    assignedTo: string,
  ): Promise<void> {
    // Direct DB save + WebSocket — works without Redis
    try {
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
      this.wsGateway.broadcastToOrg(orgId, 'notification_new', notification);
      this.logger.log(`Notification sent to user ${assignedTo} in org ${orgId}`);
    } catch (err) {
      this.logger.error(`Failed to send notification: ${err.message}`);
    }

    // BullMQ as secondary — silently skip if Redis unavailable
    try {
      await this.taskQueue.add('task-assigned', {
        type: 'assigned',
        taskId,
        projectId,
        orgId,
        assignedTo,
        taskTitle,
      });
    } catch {
      this.logger.warn('BullMQ unavailable — notification already sent via WebSocket directly');
    }
  }

  private async verifyMembership(orgId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepository.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Assigned user is not a member of this organization');
  }
}
