import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { User, MemberRole } from '../../database/entities';

@ApiTags('Organizations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: User) {
    return this.orgsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  findAll(@CurrentUser() user: User) {
    return this.orgsService.findUserOrgs(user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orgsService.findById(id, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Update organization (ADMIN only)' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgsService.update(id, dto);
  }
}
