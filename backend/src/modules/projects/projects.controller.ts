import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { User, MemberRole } from '../../database/entities';

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('organizations/:orgId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Create a new project' })
  create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.create(orgId, dto, user.id);
  }

  @Get()
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get all projects in organization' })
  findAll(@Param('orgId') orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':id')
  @Roles(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.projectsService.findOne(orgId, id);
  }

  @Patch(':id')
  @Roles(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    return this.projectsService.update(orgId, id, dto, user.id, req.currentMembership?.role);
  }

  @Delete(':id')
  @Roles(MemberRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  remove(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    return this.projectsService.remove(orgId, id, user.id, req.currentMembership?.role);
  }
}
