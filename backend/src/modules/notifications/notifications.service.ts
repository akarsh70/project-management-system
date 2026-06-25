import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async findAll(userId: string, orgId: string) {
    return this.notificationRepository.find({
      where: { userId, organizationId: orgId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findUnread(userId: string, orgId: string) {
    return this.notificationRepository.find({
      where: { userId, organizationId: orgId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string, orgId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, organizationId: orgId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string, orgId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, organizationId: orgId, isRead: false },
    });
  }
}
