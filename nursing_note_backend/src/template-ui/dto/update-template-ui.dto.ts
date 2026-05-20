import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  TEMPLATE_VALUE_TYPES,
  type TemplateValueType,
} from '../template-value-type';

export type { TemplateValueType };
export { TEMPLATE_VALUE_TYPES };

/**
 * 3중 JSON 입력. 서비스에서 한 번 더 정규화·검증합니다.
 * 레거시 호환을 위해 값이 string("text_long" 등)으로 와도 허용합니다.
 */
export type TemplateColumnInput =
  | string
  | {
      type: string;
      description?: string;
      /** radio / checkbox / selectbox 에서 필수(최소 1키). 그 외 타입은 생략 가능하며 정규화 시 `{}` 처리 */
      options?: Record<string, string>;
    };

export type TemplateSectionInput = Record<string, Record<string, TemplateColumnInput>>;

export class UpdateTemplateUiDto {
  @IsObject()
  sections!: TemplateSectionInput;

  /** 표시용 제목(비우면 null로 저장되어 templateId로 표시) */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  displayTitle?: string;
}
