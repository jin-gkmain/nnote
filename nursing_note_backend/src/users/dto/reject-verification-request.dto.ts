import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectVerificationRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string;
}

