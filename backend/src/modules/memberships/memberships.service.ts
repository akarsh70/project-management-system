import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, MemberRole, User } from '../../database/entities';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getMembers(orgId: string) {
    return this.membershipRepository.find({
      where: { organizationId: orgId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(orgId: string, dto: AddMemberDto): Promise<Membership> {
    const user = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found with that email');

    const exists = await this.membershipRepository.findOne({
      where: { userId: user.id, organizationId: orgId },
    });
    if (exists) {
      if (exists.isActive) throw new ConflictException('User already a member');
      exists.isActive = true;
      exists.role = dto.role;
      return this.membershipRepository.save(exists);
    }

    return this.membershipRepository.save(
      this.membershipRepository.create({ userId: user.id, organizationId: orgId, role: dto.role }),
    );
  }

  async updateMember(orgId: string, userId: string, dto: UpdateMemberDto, requesterId: string) {
    if (userId === requesterId) throw new BadRequestException('Cannot change your own role');

    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId: orgId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Member not found');

    // Cannot demote the last ADMIN
    if (membership.role === MemberRole.ADMIN && dto.role !== MemberRole.ADMIN) {
      const adminCount = await this.membershipRepository.count({
        where: { organizationId: orgId, role: MemberRole.ADMIN, isActive: true },
      });
      if (adminCount <= 1) throw new BadRequestException('Cannot remove the last admin');
    }

    membership.role = dto.role;
    return this.membershipRepository.save(membership);
  }

  async removeMember(orgId: string, userId: string, requesterId: string) {
    if (userId === requesterId) throw new BadRequestException('Cannot remove yourself');

    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId: orgId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.role === MemberRole.ADMIN) {
      const adminCount = await this.membershipRepository.count({
        where: { organizationId: orgId, role: MemberRole.ADMIN, isActive: true },
      });
      if (adminCount <= 1) throw new BadRequestException('Cannot remove the last admin');
    }

    membership.isActive = false;
    await this.membershipRepository.save(membership);
    return { message: 'Member removed successfully' };
  }

  async getUserRole(orgId: string, userId: string): Promise<MemberRole | null> {
    const membership = await this.membershipRepository.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });
    return membership?.role || null;
  }
}
