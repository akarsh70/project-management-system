import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, Membership, MemberRole } from '../../database/entities';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
  ) {}

  async create(dto: CreateOrganizationDto, userId: string): Promise<Organization> {
    const slugExists = await this.orgRepository.findOne({ where: { slug: dto.slug } });
    if (slugExists) throw new ConflictException('Slug already taken');

    const org = await this.orgRepository.save(this.orgRepository.create(dto));

    // Creator becomes ADMIN
    await this.membershipRepository.save(
      this.membershipRepository.create({
        userId,
        organizationId: org.id,
        role: MemberRole.ADMIN,
      }),
    );

    return org;
  }

  async findUserOrgs(userId: string): Promise<Organization[]> {
    const memberships = await this.membershipRepository.find({
      where: { userId, isActive: true },
      relations: ['organization'],
    });
    return memberships.map((m) => m.organization).filter((o) => o.isActive);
  }

  async findById(id: string, userId: string): Promise<Organization> {
    const membership = await this.membershipRepository.findOne({
      where: { organizationId: id, userId, isActive: true },
      relations: ['organization'],
    });
    if (!membership) throw new ForbiddenException('Not a member of this organization');
    if (!membership.organization.isActive) throw new NotFoundException('Organization not found');
    return membership.organization;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { id, isActive: true } });
    if (!org) throw new NotFoundException('Organization not found');
    Object.assign(org, dto);
    return this.orgRepository.save(org);
  }
}
