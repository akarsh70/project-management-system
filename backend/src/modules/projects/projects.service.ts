import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Project, ProjectStatus, Membership, MemberRole } from '../../database/entities';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ProjectsService {
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectQueue('project-events')
    private projectQueue: Queue,
    private redisService: RedisService,
  ) {}

  async create(orgId: string, dto: CreateProjectDto, userId: string): Promise<Project> {
    const project = await this.projectRepository.save(
      this.projectRepository.create({
        ...dto,
        organizationId: orgId,
        createdBy: userId,
      }),
    );

    await this.invalidateCache(orgId);

    await this.projectQueue.add('project-created', {
      type: 'created',
      projectId: project.id,
      orgId,
      userId,
      projectName: project.name,
    });

    return project;
  }

  async findAll(orgId: string): Promise<Project[]> {
    const cacheKey = `projects:${orgId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const projects = await this.projectRepository.find({
      where: { organizationId: orgId, status: ProjectStatus.ACTIVE },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(projects), this.CACHE_TTL);
    return projects;
  }

  async findOne(orgId: string, id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['createdByUser', 'tasks'],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateProjectDto,
    userId: string,
    userRole: MemberRole,
  ): Promise<Project> {
    const project = await this.findOne(orgId, id);

    if (userRole === MemberRole.EDITOR && project.createdBy !== userId) {
      throw new ForbiddenException('EDITORs can only update their own projects');
    }

    const oldValues = { name: project.name, description: project.description, status: project.status };
    Object.assign(project, dto);
    const updated = await this.projectRepository.save(project);

    await this.invalidateCache(orgId);

    await this.projectQueue.add('project-updated', {
      type: 'updated',
      projectId: id,
      orgId,
      userId,
      oldValues,
      newValues: dto,
    });

    return updated;
  }

  async remove(orgId: string, id: string, userId: string, userRole: MemberRole): Promise<void> {
    const project = await this.findOne(orgId, id);

    if (userRole === MemberRole.EDITOR && project.createdBy !== userId) {
      throw new ForbiddenException('EDITORs can only delete their own projects');
    }

    project.status = ProjectStatus.DELETED;
    await this.projectRepository.save(project);
    await this.invalidateCache(orgId);
  }

  private async invalidateCache(orgId: string): Promise<void> {
    await this.redisService.del(`projects:${orgId}`);
  }
}
