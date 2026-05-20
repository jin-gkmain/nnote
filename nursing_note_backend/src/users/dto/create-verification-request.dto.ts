import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  department!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  licenseNumber!: string;
}

