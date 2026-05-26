/** 음성기록 페이지에서 선택 가능한 간호 관련 기록지(템플릿) 목록 */
export const VOICE_RECORD_TEMPLATES = [
  "간호정보조사지",
  "퇴원간호기록지",
  "CPR 기록지",
  "욕창간호기록지",
] as const;

/** 서버와 동기화: 수정·삭제 불가 시스템 기본 양식 */
export const BUILTIN_LOCKED_VOICE_TEMPLATE_IDS: readonly string[] = [];

export function isBuiltinLockedVoiceTemplate(templateId: string): boolean {
  return BUILTIN_LOCKED_VOICE_TEMPLATE_IDS.includes(templateId);
}

export type VoiceRecordTemplateId = string;
