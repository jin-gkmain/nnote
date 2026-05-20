import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { TemplateSectionInput } from './update-template-ui.dto';

export class CreateTemplateUiTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  templateId!: string;

  @IsObject()
  sections!: TemplateSectionInput;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  displayTitle?: string;
}
