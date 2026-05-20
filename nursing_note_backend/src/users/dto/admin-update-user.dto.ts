import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  department?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

