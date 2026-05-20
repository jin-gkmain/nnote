import { BadRequestException } from '@nestjs/common';

export interface AbbreviationEntry {
  trigger: string;
  replacement: string;
}

export interface UpdateAbbreviationsDto {
  enabled?: boolean;
  entries: AbbreviationEntry[];
}

export function validateAbbreviationPayload(dto: UpdateAbbreviationsDto): void {
  if (!Array.isArray(dto.entries)) {
    throw new BadRequestException('entries는 배열이어야 합니다.');
  }
  if (dto.entries.length > 200) {
    throw new BadRequestException('약어는 최대 200개까지 저장할 수 있습니다.');
  }
  const seen = new Set<string>();
  for (const entry of dto.entries) {
    if (!entry || typeof entry !== 'object') {
      throw new BadRequestException('약어 항목 형식이 올바르지 않습니다.');
    }
    const trigger = String(entry.trigger ?? '').trim();
    const replacement = String(entry.replacement ?? '').trim();
    if (!trigger.startsWith('.')) {
      throw new BadRequestException('trigger는 "."로 시작해야 합니다.');
    }
    if (trigger.length < 2 || trigger.length > 64) {
      throw new BadRequestException('trigger 길이는 2~64자여야 합니다.');
    }
    if (/\s/.test(trigger)) {
      throw new BadRequestException('trigger에는 공백을 포함할 수 없습니다.');
    }
    if (!replacement) {
      throw new BadRequestException('replacement는 비어 있을 수 없습니다.');
    }
    if (replacement.length > 2000) {
      throw new BadRequestException('replacement는 최대 2000자까지 허용됩니다.');
    }
    if (seen.has(trigger)) {
      throw new BadRequestException(`중복 trigger가 존재합니다: ${trigger}`);
    }
    seen.add(trigger);
  }
}
