import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Membership } from './membership.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Notification } from './notification.entity';
import { RefreshToken } from './refresh-token.entity';
import { AuditLog } from './audit-log.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];

  @OneToMany(() => Project, (p) => p.createdByUser)
  createdProjects: Project[];

  @OneToMany(() => Task, (t) => t.assignedToUser)
  assignedTasks: Task[];

  @OneToMany(() => Task, (t) => t.createdByUser)
  createdTasks: Task[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => AuditLog, (al) => al.user)
  auditLogs: AuditLog[];
}
