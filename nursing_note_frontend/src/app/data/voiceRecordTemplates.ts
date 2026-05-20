/** 음성기록 페이지에서 선택 가능한 간호 관련 기록지(템플릿) 목록 */
export const VOICE_RECORD_TEMPLATES = [
  "간호기록지",
  "간호인계기록지",
  "임상관찰기록지",
  "입원간호평가기록지",
  "퇴원간호지시서",
  "수술간호기록지",
  "낙상위험평가기록지",
  "SOAP",
  "SOAPIE",
  "SBAR",
] as const;

/** 서버와 동기화: 수정·삭제 불가 시스템 기본 양식 */
export const BUILTIN_LOCKED_VOICE_TEMPLATE_IDS: readonly string[] = [
  "SOAP",
  "SOAPIE",
  "SBAR",
];

export function isBuiltinLockedVoiceTemplate(templateId: string): boolean {
  return BUILTIN_LOCKED_VOICE_TEMPLATE_IDS.includes(templateId);
}

export type VoiceRecordTemplateId = string;
