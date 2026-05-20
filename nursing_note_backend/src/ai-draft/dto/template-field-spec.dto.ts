import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { TEMPLATE_VALUE_TYPES, type TemplateValueType } from '../../template-ui/template-value-type';

const TEMPLATE_VALUE_TYPE_VALUES = [...TEMPLATE_VALUE_TYPES] as [TemplateValueType, ...TemplateValueType[]];

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
  valueType?: TemplateValueType;

  /** radio / checkbox / selectbox 일 때 허용되는 옵션 키(저장값) 목록 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionKeys?: string[];
}
