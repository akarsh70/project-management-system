import {
  Controller, Get, Patch, Param, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, OrgId, Roles } from '../common/decorators';
import { User, MemberRole } from '../../database/entities';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get all notifications' })
  findAll(@CurrentUser() user: User, @OrgId() orgId: string) {
    return this.notificationsService.findAll(user.id, orgId);
  }

  @Get('unread-count')
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get unread notifications count' })
  unreadCount(@CurrentUser() user: User, @OrgId() orgId: string) {
    return this.notificationsService.getUnreadCount(user.id, orgId);
  }

  @Patch(':id/read')
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: User, @OrgId() orgId: string) {
    return this.notificationsService.markAllAsRead(user.id, orgId);
  }
}
