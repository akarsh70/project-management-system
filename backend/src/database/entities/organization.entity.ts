import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Membership } from './membership.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Notification } from './notification.entity';
import { AuditLog } from './audit-log.entity';

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Membership, (m) => m.organization)
  memberships: Membership[];

  @OneToMany(() => Project, (p) => p.organization)
  projects: Project[];

  @OneToMany(() => Task, (t) => t.organization)
  tasks: Task[];

  @OneToMany(() => Notification, (n) => n.organization)
  notifications: Notification[];

  @OneToMany(() => AuditLog, (al) => al.organization)
  auditLogs: AuditLog[];
}
