import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from '../../../database/entities';

export class AddMemberDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: MemberRole, default: MemberRole.VIEWER })
  @IsEnum(MemberRole)
  role: MemberRole;
}
