import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ProjectsService } from '../../src/modules/projects/projects.service';
import { Project } from '../../src/database/entities/project.entity';
import { Membership } from '../../src/database/entities/membership.entity';
import { RedisService } from '../../src/modules/redis/redis.service';
import { ProjectStatus } from '../../src/database/entities/project.entity';
import { MemberRole } from '../../src/database/entities/membership.entity';

const mockProjectRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

const mockMembershipRepo = {
  findOne: jest.fn(),
};

const mockProjectQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProject: Partial<Project> = {
    id: 'proj-uuid-1',
    name: 'Test Project',
    description: 'Test description',
    status: ProjectStatus.ACTIVE,
    organizationId: 'org-uuid-1',
    createdBy: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(Membership), useValue: mockMembershipRepo },
        { provide: getQueueToken('project-events'), useValue: mockProjectQueue },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create project, invalidate cache, and add to queue', async () => {
      mockProjectRepo.create.mockReturnValue(mockProject);
      mockProjectRepo.save.mockResolvedValue(mockProject);

      const result = await service.create(
        'org-uuid-1',
        { name: 'Test Project', description: 'Test description' },
        'user-uuid-1',
      );

      expect(result).toEqual(mockProject);
      expect(mockProjectRepo.create).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test description',
        organizationId: 'org-uuid-1',
        createdBy: 'user-uuid-1',
      });
      expect(mockRedisService.del).toHaveBeenCalledWith('projects:org-uuid-1');
      expect(mockProjectQueue.add).toHaveBeenCalledWith(
        'project-created',
        expect.objectContaining({ orgId: 'org-uuid-1' }),
      );
    });
  });

  describe('findAll', () => {
    it('should return cached projects on cache hit', async () => {
      const cachedProjects = [mockProject];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedProjects));

      const result = await service.findAll('org-uuid-1');

      expect(result).toEqual(cachedProjects);
      expect(mockProjectRepo.find).not.toHaveBeenCalled();
      expect(mockRedisService.get).toHaveBeenCalledWith('projects:org-uuid-1');
    });

    it('should fetch from DB, set cache, and return on cache miss', async () => {
      const dbProjects = [mockProject];
      mockRedisService.get.mockResolvedValue(null);
      mockProjectRepo.find.mockResolvedValue(dbProjects);

      const result = await service.findAll('org-uuid-1');

      expect(result).toEqual(dbProjects);
      expect(mockProjectRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-uuid-1', status: expect.not.stringContaining('DELETED') },
        order: { createdAt: 'DESC' },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'projects:org-uuid-1',
        JSON.stringify(dbProjects),
        300,
      );
    });
  });

  describe('findOne', () => {
    it('should return project if found in org', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('org-uuid-1', 'proj-uuid-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'proj-uuid-1', organizationId: 'org-uuid-1' },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('org-uuid-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project and invalidate cache', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Name' };
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockProjectRepo.save.mockResolvedValue(updatedProject);

      const result = await service.update(
        'org-uuid-1',
        'proj-uuid-1',
        { name: 'Updated Name' },
        'user-uuid-1',
        MemberRole.ADMIN,
      );

      expect(result.name).toBe('Updated Name');
      expect(mockRedisService.del).toHaveBeenCalledWith('projects:org-uuid-1');
    });

    it('should throw ForbiddenException when EDITOR tries to update others project', async () => {
      const otherUsersProject = { ...mockProject, createdBy: 'other-user-id' };
      mockProjectRepo.findOne.mockResolvedValue(otherUsersProject);

      await expect(
        service.update(
          'org-uuid-1',
          'proj-uuid-1',
          { name: 'Updated' },
          'user-uuid-1',
          MemberRole.EDITOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete project (set status to DELETED)', async () => {
      mockProjectRepo.findOne.mockResolvedValue(mockProject);
      mockProjectRepo.save.mockResolvedValue({ ...mockProject, status: ProjectStatus.DELETED });

      await service.remove('org-uuid-1', 'proj-uuid-1', 'user-uuid-1', MemberRole.ADMIN);

      expect(mockRedisService.del).toHaveBeenCalledWith('projects:org-uuid-1');
    });
  });
});
