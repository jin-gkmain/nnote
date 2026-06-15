import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsEmail()
  @MaxLength(255)
  replyEmail: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content: string;
}
