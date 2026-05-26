import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { TEMPLATE_FIELD_TYPES, type TemplateFieldType } from '../../templates/templates.types';

const TEMPLATE_VALUE_TYPE_VALUES = [...TEMPLATE_FIELD_TYPES] as [TemplateFieldType, ...TemplateFieldType[]];

/**
 * Single template slot the LLM must fill (key + human-readable meaning).
 */
export class TemplateFieldSpecDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** fields_json 의 type 과 동일하면 template_fill 제약·정규화에 사용 */
  @IsOptional()
  @IsIn(TEMPLATE_VALUE_TYPE_VALUES)
  valueType?: TemplateFieldType;

  /** single_select / multi_select 일 때 허용되는 옵션 키(저장값) 목록 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionKeys?: string[];

  @IsOptional()
  options?: Array<{ optionKey: string; label: string; allowFreeText?: boolean }>;

  @IsOptional()
  conditions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inputSources?: string[];

  @IsOptional()
  @IsString()
  aiHint?: string;

  @IsOptional()
  @IsString()
  sourceDefinition?: string;
}
