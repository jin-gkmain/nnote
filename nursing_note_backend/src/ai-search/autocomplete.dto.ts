import { BadRequestException } from '@nestjs/common';

export interface AutocompleteRequestDto {
  templateId: string;
  fieldKey: string;
  currentText: string;
  patientId?: number;
  patientContext?: string;
  recentRecordContext?: string;
}

export interface AutocompleteResponseDto {
  suggestion: string | null;
  source: 'qdrant' | 'fallback';
  score: number;
  latencyMs: number;
}

export function validateAutocompleteRequest(dto: AutocompleteRequestDto): void {
  if (!dto.templateId?.trim()) throw new BadRequestException('templateId가 필요합니다.');
  if (!dto.fieldKey?.trim()) throw new BadRequestException('fieldKey가 필요합니다.');
  if (!dto.currentText?.trim()) throw new BadRequestException('currentText가 필요합니다.');
  if (dto.patientId != null) {
    if (!Number.isInteger(dto.patientId) || dto.patientId <= 0) {
      throw new BadRequestException('patientId는 양의 정수여야 합니다.');
    }
  }
}
