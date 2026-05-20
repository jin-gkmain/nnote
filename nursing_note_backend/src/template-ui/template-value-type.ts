/** JSON fields_json 칼럼 타입 (레거시 `text`는 수신·저장소 읽기 시 `text_long`으로 정규화) */
export const TEMPLATE_VALUE_TYPES = [
  'text_long',
  'text_short',
  'number',
  'date',
  'boolean',
  'radio',
  'checkbox',
  'selectbox',
] as const;

export type TemplateValueType = (typeof TEMPLATE_VALUE_TYPES)[number];

export const LEGACY_TEMPLATE_VALUE_TYPES = ['text'] as const;

export function isCanonicalTemplateValueType(v: string): v is TemplateValueType {
  return (TEMPLATE_VALUE_TYPES as readonly string[]).includes(v);
}

/** API/DB에서 읽은 원시 문자열을 정규 타입으로 변환 */
export function normalizeTemplateValueType(raw: string): TemplateValueType {
  const v = String(raw).trim();
  if (v === 'text') return 'text_long';
  if (isCanonicalTemplateValueType(v)) return v;
  throw new Error(`Invalid template value type: ${raw}`);
}
