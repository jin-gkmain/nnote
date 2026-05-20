import { IsString, IsOptional } from 'class-validator';

/**
 * 환자 정보 수정 DTO
 * - 모든 필드가 Optional: 변경하고 싶은 필드만 보내면 됨
 */
export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  attendingDoctor?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}
