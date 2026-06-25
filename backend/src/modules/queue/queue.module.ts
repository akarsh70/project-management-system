import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ProjectEventsProcessor } from './processors/project-events.processor';
import { TaskEventsProcessor } from './processors/task-events.processor';
import { AuditLogProcessor } from './processors/audit-log.processor';
import { Membership, Notification, AuditLog } from '../../database/entities';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership, Notification, AuditLog]),
    BullModule.registerQueue(
      { name: 'project-events' },
      { name: 'task-events' },
      { name: 'audit-logs' },
    ),
    WebsocketModule,
  ],
  providers: [ProjectEventsProcessor, TaskEventsProcessor, AuditLogProcessor],
})
export class QueueModule {}
