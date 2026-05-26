import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TEMPLATE_FIELD_TYPES, type TemplateFieldType } from '../templates.types';

class UpdateTemplateFieldOptionDto {
  @IsString()
  @MaxLength(128)
  optionKey!: string;

  @IsString()
  @MaxLength(128)
  label!: string;

  @IsBoolean()
  allowFreeText!: boolean;

  @IsInt()
  @Min(1)
  displayOrder!: number;
}

class UpdateTemplateFieldConditionDto {
  @IsString()
  conditionType!: 'free_text_when_option';

  @IsString()
  triggerFieldKey!: string;

  @IsString()
  triggerOptionKey!: string;

  @IsString()
  targetFieldKey!: string;
}

class UpdateTemplateFieldDto {
  @IsString()
  @MaxLength(96)
  fieldKey!: string;

  @IsString()
  @MaxLength(256)
  label!: string;

  @IsIn(TEMPLATE_FIELD_TYPES)
  type!: TemplateFieldType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  aiHint?: string;

  @IsArray()
  @IsString({ each: true })
  inputSources!: string[];

  @IsInt()
  @Min(0)
  sourceRow!: number;

  @IsOptional()
  @IsString()
  sourceDefinition?: string;

  @IsInt()
  @Min(1)
  displayOrder!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateFieldOptionDto)
  options!: UpdateTemplateFieldOptionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateFieldConditionDto)
  conditions!: UpdateTemplateFieldConditionDto[];
}

class UpdateTemplateSectionDto {
  @IsString()
  @MaxLength(96)
  sectionKey!: string;

  @IsString()
  @MaxLength(256)
  title!: string;

  @IsInt()
  @Min(1)
  displayOrder!: number;

  @IsBoolean()
  repeatable!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateFieldDto)
  fields!: UpdateTemplateFieldDto[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTemplateSectionDto)
  sections!: UpdateTemplateSectionDto[];
}
