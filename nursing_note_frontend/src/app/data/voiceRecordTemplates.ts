/** 서버와 동기화: 수정·삭제 불가 시스템 기본 양식 */
export const BUILTIN_LOCKED_VOICE_TEMPLATE_IDS: readonly string[] = [];

export function isBuiltinLockedVoiceTemplate(templateId: string): boolean {
  return BUILTIN_LOCKED_VOICE_TEMPLATE_IDS.includes(templateId);
}

export type VoiceRecordTemplateId = string;
