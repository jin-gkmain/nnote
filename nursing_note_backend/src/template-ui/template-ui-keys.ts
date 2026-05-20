export const DEFAULT_TEMPLATE_IDS: readonly string[] = [
  '간호기록지',
  '간호인계기록지',
  '임상관찰기록지',
  '입원간호평가기록지',
  '퇴원간호지시서',
  '수술간호기록지',
  '낙상위험평가기록지',
  'SOAP',
  'SOAPIE',
  'SBAR',
] as const;

/** 시스템 기본 양식 — API로 수정·삭제 불가 */
export const BUILTIN_LOCKED_TEMPLATE_IDS: readonly string[] = [
  'SOAP',
  'SOAPIE',
  'SBAR',
] as const;

export function isValidTemplateId(templateId: string): boolean {
  const value = templateId.trim();
  return value.length > 0 && value.length <= 64;
}
