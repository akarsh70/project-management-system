import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { User, MemberRole } from '../../database/entities';

@ApiTags('Memberships')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('organizations/:orgId/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get all members of an organization' })
  getMembers(@Param('orgId') orgId: string) {
    return this.membershipsService.getMembers(orgId);
  }

  @Post()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Add member to organization (ADMIN only)' })
  addMember(@Param('orgId') orgId: string, @Body() dto: AddMemberDto) {
    return this.membershipsService.addMember(orgId, dto);
  }

  @Patch(':userId')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Update member role (ADMIN only)' })
  updateMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.membershipsService.updateMember(orgId, userId, dto, requesterId);
  }

  @Delete(':userId')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Remove member from organization (ADMIN only)' })
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.membershipsService.removeMember(orgId, userId, requesterId);
  }
}
