import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TemplateFieldSpecDto } from './template-field-spec.dto';

export class StructuredHintDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  confidence: number;

  @IsIn(['rule', 'input'])
  source: 'rule' | 'input';
}

export class AiDraftRequestDto {
  @IsString()
  text: string;

  @IsIn(['sbar', 'soapie', 'observation', 'template_fill', 'transcript_digest'])
  type: 'sbar' | 'soapie' | 'observation' | 'template_fill' | 'transcript_digest';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldSpecDto)
  templateFields?: TemplateFieldSpecDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructuredHintDto)
  structuredHints?: StructuredHintDto[];
}
