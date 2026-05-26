import {
  VOICE_RECORD_TEMPLATES,
  type VoiceRecordTemplateId,
} from "@/app/data/voiceRecordTemplates";

/** JSON fields_json·화면 필드 종류 (레거시 `text` → `text_long`) */
export const TEMPLATE_VALUE_TYPES = [
  "text_long",
  "text_short",
  "number",
  "date",
  "boolean",
  "radio",
  "checkbox",
  "selectbox",
] as const;

export type TemplateValueType = (typeof TEMPLATE_VALUE_TYPES)[number];

/** 기존 코드 호환: 입력 종류 = 저장 타입과 동일 */
export type TemplateInputKind = TemplateValueType;

/**
 * 3중 JSON 모델: { 대주제: { 소주제: { type, description?, options? } } }
 * description은 선택. radio/checkbox/selectbox 는 options(객체)로 선택지를 둡니다.
 */
export interface TemplateColumnDef {
  type: TemplateValueType;
  description?: string;
  /** 키=저장값·라벨, 값=보조 문자열. choice 타입이 아니면 저장 시 생략 가능 */
  options?: Record<string, string>;
}
export type TemplateSectionMap = Record<string, Record<string, TemplateColumnDef>>;

export interface TemplateUiConfigMeta {
  templateId?: string;
  /** 화면 표시용 제목(없으면 templateId로 표시) */
  displayTitle?: string | null;
  sections: TemplateSectionMap | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface TemplateSectionPreset {
  presetId: string;
  category: "common" | "patient" | "extra";
  title: string;
  sections: TemplateSectionMap;
}

/** 라벨의 ` · ` 기준으로 대주제·소제목 분리 (설정 미리보기·AI/OCR 그룹화 공통) */
export function splitTemplateLabel(label: string): { section: string; field: string } {
  const parts = label.split(" · ");
  if (parts.length >= 2) {
    return {
      section: parts[0]!.trim() || "기본",
      field: parts.slice(1).join(" · ").trim() || label,
    };
  }
  return { section: "기본", field: label };
}

export interface TemplateFieldDefault {
  readonly storageKey: string;
  readonly label: string;
  readonly description?: string;
  readonly inputKind: TemplateInputKind;
  readonly unit?: string;
  readonly fullRow?: boolean;
  readonly options?: Readonly<Record<string, string>>;
}

export interface TemplateFieldEffective extends TemplateFieldDefault {
  hidden: boolean;
}

export interface TemplateUiFieldConfig {
  storageKey: string;
  label: string;
  description?: string;
  hidden: boolean;
  inputKind: TemplateInputKind;
  unit?: string;
  fullRow?: boolean;
  /** radio / checkbox / selectbox — 설정 저장 시 fields_json 에 반영 */
  options?: Record<string, string>;
}

export function isChoiceTemplateValueType(type: TemplateValueType): boolean {
  return type === "radio" || type === "checkbox" || type === "selectbox";
}

function parseOptionsLenientFromUnknown(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = k.trim();
    if (!key) continue;
    out[key] = typeof v === "string" ? v : String(v ?? "");
  }
  return out;
}

/** API/저장소에서 읽은 원시 타입 문자열 정규화 */
export function isValidRawTemplateValueType(raw: string): boolean {
  const v = String(raw).trim();
  return v === "text" || (TEMPLATE_VALUE_TYPES as readonly string[]).includes(v);
}

export function normalizeStoredTemplateValueType(raw: string): TemplateValueType {
  const v = String(raw).trim();
  if (v === "text") return "text_long";
  if ((TEMPLATE_VALUE_TYPES as readonly string[]).includes(v)) {
    return v as TemplateValueType;
  }
  return "text_long";
}

/**
 * 서버 또는 사용자가 입력한 sections를 3중 정규 형태로 변환.
 * 값이 string이면 `{type: 정규화}`로, 객체면 type/description 추출.
 */
export function normalizeStoredSectionMap(value: unknown): TemplateSectionMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: TemplateSectionMap = {};
  let hasAny = false;
  for (const [sectionName, columns] of Object.entries(value as Record<string, unknown>)) {
    if (!columns || typeof columns !== "object" || Array.isArray(columns)) continue;
    out[sectionName] = {};
    for (const [columnName, raw] of Object.entries(columns as Record<string, unknown>)) {
      if (typeof raw === "string") {
        const t = normalizeStoredTemplateValueType(raw);
        if (isChoiceTemplateValueType(t)) {
          out[sectionName][columnName] = { type: "text_long" };
        } else {
          out[sectionName][columnName] = { type: t };
        }
        hasAny = true;
      } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const def: TemplateColumnDef = {
          type: normalizeStoredTemplateValueType(String(obj.type ?? "text_long")),
        };
        if (typeof obj.description === "string" && obj.description.trim()) {
          def.description = obj.description.trim();
        }
        const opt = parseOptionsLenientFromUnknown(obj.options);
        if (opt !== undefined) {
          def.options = opt;
        } else if (isChoiceTemplateValueType(def.type)) {
          def.options = {};
        }
        out[sectionName][columnName] = def;
        hasAny = true;
      }
    }
  }
  return hasAny ? out : null;
}

const SOAP_DEFAULTS: readonly TemplateFieldDefault[] = [
  {
    storageKey: "situation",
    label: "S · 주관적 자료 (Subjective)",
    description: "환자가 말한 주관적 증상·호소",
    inputKind: "text_long",
  },
  {
    storageKey: "objective",
    label: "O · 객관적 자료 (Objective)",
    description: "측정·관찰된 객관적 소견",
    inputKind: "text_long",
  },
  {
    storageKey: "assessment",
    label: "A · 사정 (Assessment)",
    description: "간호사의 사정·판단",
    inputKind: "text_long",
  },
  {
    storageKey: "plan",
    label: "P · 계획 (Planning)",
    description: "간호 계획",
    inputKind: "text_long",
  },
  {
    storageKey: "intervention",
    label: "I · 중재 (Intervention)",
    description: "수행한 간호 중재",
    inputKind: "text_long",
  },
  {
    storageKey: "evaluation",
    label: "E · 평가 (Evaluation)",
    description: "중재 결과 평가",
    inputKind: "text_long",
  },
];

/** SOAP 양식: S/O/A/P 네 항목만 */
const SOAP_SHORT_DEFAULTS: readonly TemplateFieldDefault[] = SOAP_DEFAULTS.slice(0, 4);

const SBAR_DEFAULTS: readonly TemplateFieldDefault[] = [
  {
    storageKey: "작성자",
    label: "작성자",
    inputKind: "text_short",
  },
  {
    storageKey: "situation",
    label: "S (Situation)",
    description: "현재 상황·핵심 이슈",
    inputKind: "text_long",
  },
  {
    storageKey: "background",
    label: "B (Background)",
    description: "관련 배경·맥락",
    inputKind: "text_long",
  },
  {
    storageKey: "assessment",
    label: "A (Assessment)",
    description: "간호사의 종합 사정",
    inputKind: "text_long",
  },
  {
    storageKey: "recommendation",
    label: "R (Recommendation)",
    description: "권고·필요 조치",
    inputKind: "text_long",
  },
];

const CLINICAL_DEFAULTS: readonly TemplateFieldDefault[] = [
  { storageKey: "진료일시", label: "기본 · 진료일시", inputKind: "date" },
  { storageKey: "작성자성명", label: "기본 · 작성자 성명", inputKind: "text_short" },
  { storageKey: "진료과", label: "기본 · 진료과", inputKind: "text_short" },
  {
    storageKey: "내과세부진료과목",
    label: "기본 · 내과 세부 진료과목",
    inputKind: "text_short",
  },
  { storageKey: "활력징후.측정일시", label: "활력징후 · 측정일시", inputKind: "text_short" },
  { storageKey: "활력징후.혈압", label: "활력징후 · 혈압", inputKind: "text_short" },
  { storageKey: "활력징후.맥박", label: "활력징후 · 맥박", inputKind: "number" },
  { storageKey: "활력징후.체온", label: "활력징후 · 체온", inputKind: "number" },
  { storageKey: "활력징후.호흡", label: "활력징후 · 호흡", inputKind: "number" },
  { storageKey: "활력징후.산소포화도", label: "활력징후 · 산소포화도", inputKind: "number", unit: "%" },
  { storageKey: "활력징후.혈당", label: "활력징후 · 혈당", inputKind: "number", unit: "mg/dL" },
  { storageKey: "신체계측.측정일시", label: "신체계측 · 측정일시", inputKind: "text_short" },
  { storageKey: "신체계측.체중", label: "신체계측 · 체중", inputKind: "number", unit: "kg" },
  { storageKey: "신체계측.신장", label: "신체계측 · 신장", inputKind: "number", unit: "cm" },
  { storageKey: "신체계측.두위", label: "신체계측 · 두위", inputKind: "number", unit: "cm" },
  { storageKey: "신체계측.흉위", label: "신체계측 · 흉위", inputKind: "number", unit: "cm" },
  { storageKey: "신체계측.복위", label: "신체계측 · 복위", inputKind: "number", unit: "cm" },
  { storageKey: "신체계측.특이사항", label: "신체계측 · 특이사항", inputKind: "text_long" },
  { storageKey: "섭취배설.측정시작일시", label: "섭취·배설 · 측정 시작 일시", inputKind: "text_short" },
  { storageKey: "섭취배설.측정종료일시", label: "섭취·배설 · 측정 종료 일시", inputKind: "text_short" },
  { storageKey: "섭취배설.특이사항", label: "섭취·배설 · 특이사항", inputKind: "text_long" },
  { storageKey: "섭취배설.섭취_총량", label: "섭취·배설 · 섭취 총량", inputKind: "number", unit: "mL" },
  { storageKey: "섭취배설.섭취_정맥", label: "섭취·배설 · 섭취 정맥", inputKind: "number", unit: "mL" },
  { storageKey: "섭취배설.섭취_기타", label: "섭취·배설 · 섭취 기타", inputKind: "number", unit: "mL" },
  { storageKey: "섭취배설.배설_총량", label: "섭취·배설 · 배설 총량", inputKind: "number", unit: "mL" },
  { storageKey: "섭취배설.배설_배뇨", label: "섭취·배설 · 배설 배뇨", inputKind: "number", unit: "mL" },
  { storageKey: "섭취배설.배설_기타", label: "섭취·배설 · 배설 기타", inputKind: "number", unit: "mL" },
  { storageKey: "기타관찰.측정일시", label: "기타 관찰 · 측정일시", inputKind: "text_short" },
  { storageKey: "기타관찰.항목명", label: "기타 관찰 · 항목명", inputKind: "text_short" },
  { storageKey: "기타관찰.관찰내용", label: "기타 관찰 · 관찰내용", inputKind: "text_long" },
  { storageKey: "기타관찰.특이사항", label: "기타 관찰 · 특이사항", inputKind: "text_long" },
  { storageKey: "추가정보.간병유무", label: "추가 정보 · 간병 유무", inputKind: "text_short" },
  { storageKey: "추가정보.도뇨관리", label: "추가 정보 · 도뇨 관리", inputKind: "text_short" },
];

const SINGLE_CONTENT: readonly TemplateFieldDefault[] = [
  {
    storageKey: "content",
    label: "기록 내용",
    description: "서식에 맞게 정리할 내용",
    inputKind: "text_long",
  },
];

const DEFAULTS_BY_TEMPLATE: Record<VoiceRecordTemplateId, readonly TemplateFieldDefault[]> =
  {
    간호기록지: SOAP_DEFAULTS,
    간호인계기록지: SBAR_DEFAULTS,
    임상관찰기록지: CLINICAL_DEFAULTS,
    입원간호평가기록지: SINGLE_CONTENT,
    퇴원간호지시서: SINGLE_CONTENT,
    수술간호기록지: SINGLE_CONTENT,
    낙상위험평가기록지: SINGLE_CONTENT,
    SOAP: SOAP_SHORT_DEFAULTS,
    SOAPIE: SOAP_DEFAULTS,
    SBAR: SBAR_DEFAULTS,
  };

export function getDefaultTemplateFields(
  templateId: VoiceRecordTemplateId,
): readonly TemplateFieldDefault[] {
  return DEFAULTS_BY_TEMPLATE[templateId] ?? SINGLE_CONTENT;
}

/** 서버에 sections가 없을 때 관리자 미리보기용 섹션 맵(클라이언트 기본 필드 기준) */
export function fallbackSectionMapFromTemplateDefaults(
  templateId: VoiceRecordTemplateId,
): TemplateSectionMap {
  const fields = [...getDefaultTemplateFields(templateId)];
  const map: TemplateSectionMap = {};
  for (const f of fields) {
    const { section } = splitTemplateLabel(f.label);
    const sec = section.trim() || "기본";
    if (!map[sec]) map[sec] = {};
    const def: TemplateColumnDef = { type: f.inputKind };
    if (f.description) def.description = f.description;
    map[sec][f.storageKey] = def;
  }
  return map;
}

/** 서버 3중 sections를 (storageKey → 라벨/타입/설명/옵션) 룩업으로 평탄화 */
function buildOverrideLookup(
  serverSections: TemplateSectionMap | null | undefined,
): Map<
  string,
  {
    label: string;
    type: TemplateValueType;
    description: string;
    options?: Record<string, string>;
  }
> {
  const lookup = new Map<
    string,
    {
      label: string;
      type: TemplateValueType;
      description: string;
      options?: Record<string, string>;
    }
  >();
  if (!serverSections) return lookup;
  for (const section of Object.values(serverSections)) {
    for (const [columnName, def] of Object.entries(section ?? {})) {
      lookup.set(columnName, {
        label: columnName,
        type: def?.type ?? "text_long",
        description: def?.description ?? "",
        ...(def?.options !== undefined ? { options: { ...def.options } } : {}),
      });
    }
  }
  return lookup;
}

export function mergeTemplateFieldOverrides(
  templateId: VoiceRecordTemplateId,
  serverSections: TemplateSectionMap | null | undefined,
): TemplateFieldEffective[] {
  const defaults = [...getDefaultTemplateFields(templateId)];
  const hasServerColumns = serverSections
    ? Object.values(serverSections).some((columns) => Object.keys(columns ?? {}).length > 0)
    : false;
  if (!hasServerColumns) {
    return defaults.map((field) => ({ ...field, hidden: false }));
  }

  const fields: TemplateFieldEffective[] = [];
  for (const [sectionName, columns] of Object.entries(serverSections ?? {})) {
    for (const [columnName, def] of Object.entries(columns ?? {})) {
      const t = def?.type ?? "text_long";
      const opts = isChoiceTemplateValueType(t) ? { ...(def?.options ?? {}) } : undefined;
      const displayColumnName = columnName.startsWith(`${sectionName}.`)
        ? columnName.slice(sectionName.length + 1)
        : columnName;
      fields.push({
        storageKey: columnName,
        label: `${sectionName} · ${displayColumnName}`,
        description: def?.description ?? "",
        inputKind: t,
        hidden: false,
        ...(opts !== undefined ? { options: opts } : {}),
      });
    }
  }
  if (fields.length > 0) return fields;

  const lookup = buildOverrideLookup(serverSections);
  return defaults.map((baseField) => {
    const override = lookup.get(baseField.storageKey);
    if (!override) return { ...baseField, hidden: false };
    return {
      ...baseField,
      label: override.label || baseField.label,
      inputKind: override.type,
      description: override.description || baseField.description,
      hidden: false,
      ...(override.options !== undefined
        ? { options: { ...override.options } }
        : isChoiceTemplateValueType(override.type)
          ? { options: {} }
          : {}),
    };
  });
}

export async function getMergedTemplateFields(
  templateId: VoiceRecordTemplateId,
): Promise<TemplateFieldEffective[]> {
  const map = await fetchTemplateUiConfigMap();
  return mergeTemplateFieldOverrides(templateId, map[templateId]?.sections ?? null);
}

export type TemplateUiConfigMap = Record<string, TemplateUiConfigMeta>;

export async function fetchTemplateUiConfigMap(): Promise<TemplateUiConfigMap> {
  try {
    const res = await fetch("/api/settings/template-ui");
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, unknown>;
    if (!data || typeof data !== "object") return {};
    const normalized: TemplateUiConfigMap = {};
    for (const [templateId, value] of Object.entries(data)) {
      if (value && typeof value === "object" && "sections" in (value as Record<string, unknown>)) {
        const meta = value as TemplateUiConfigMeta & { sections: unknown };
        normalized[templateId] = {
          templateId: meta.templateId ?? templateId,
          displayTitle: meta.displayTitle ?? null,
          sections: normalizeStoredSectionMap(meta.sections),
          createdAt: meta.createdAt ?? null,
          updatedAt: meta.updatedAt ?? null,
        };
        continue;
      }
      normalized[templateId] = {
        templateId,
        displayTitle: null,
        sections: normalizeStoredSectionMap(value),
        createdAt: null,
        updatedAt: null,
      };
    }
    return normalized;
  } catch {
    return {};
  }
}

export async function fetchTemplateSectionPresets(token: string): Promise<TemplateSectionPreset[]> {
  try {
    const res = await fetch("/api/settings/template-ui/presets", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      presetId: string;
      category: "common" | "patient" | "extra";
      title: string;
      sections: unknown;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .map((preset) => {
        const sections = normalizeStoredSectionMap(preset.sections);
        if (!sections) return null;
        return {
          presetId: preset.presetId,
          category: preset.category,
          title: preset.title,
          sections,
        } as TemplateSectionPreset;
      })
      .filter((p): p is TemplateSectionPreset => p != null);
  } catch {
    return [];
  }
}

/** 어드민 화면에서 단일 섹션으로 묶어 저장할 때 사용 */
export function fieldConfigsToSectionMap(fields: TemplateUiFieldConfig[]): TemplateSectionMap {
  const out: TemplateSectionMap = {};
  for (const field of fields) {
    if (field.hidden) continue;
    const { section: sectionName } = splitTemplateLabel(field.label);
    if (!out[sectionName]) out[sectionName] = {};
    const def: TemplateColumnDef = { type: field.inputKind };
    if (field.description && field.description.trim()) {
      def.description = field.description.trim();
    }
    if (isChoiceTemplateValueType(field.inputKind)) {
      def.options =
        field.options && Object.keys(field.options).length > 0 ? { ...field.options } : {};
    }
    out[sectionName][field.storageKey] = def;
  }
  return out;
}

export function invalidateTemplateUiConfigCache(): void {
  // TanStack Query 캐시를 사용하므로 기존 수동 캐시는 더 이상 사용하지 않습니다.
}

export function textareaRowsForKind(kind: TemplateInputKind): number {
  if (kind === "text_long") return 6;
  if (kind === "text_short") return 3;
  return 2;
}

/** boolean 필드 저장값: 공백 / 예 / 아니오 */
export const BOOLEAN_FIELD_EMPTY = "";
export const BOOLEAN_FIELD_YES = "yes";
export const BOOLEAN_FIELD_NO = "no";

export function normalizeBooleanFieldValue(raw: string): string {
  const t = String(raw).trim().toLowerCase();
  if (!t) return BOOLEAN_FIELD_EMPTY;
  if (t === BOOLEAN_FIELD_YES || t === "y" || t === "예" || t === "true" || t === "1") {
    return BOOLEAN_FIELD_YES;
  }
  if (t === BOOLEAN_FIELD_NO || t === "n" || t === "아니오" || t === "아니요" || t === "false" || t === "0") {
    return BOOLEAN_FIELD_NO;
  }
  return BOOLEAN_FIELD_EMPTY;
}

/** type=date용: yyyy-mm-dd만 통과, 그 외는 빈 문자열 */
export function coerceDateInputValue(raw: string): string {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

/** checkbox 필드: 저장 문자열 ↔ 선택된 옵션 키 목록 */
export function parseCheckboxCsvToKeys(raw: string, allowedKeys: readonly string[]): string[] {
  const allowed = new Set(allowedKeys);
  const parts = String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const kept = parts.filter((p) => allowed.has(p));
  return [...new Set(kept)].sort();
}

export function serializeCheckboxKeysToCsv(keys: readonly string[]): string {
  return [...new Set(keys.map((k) => k.trim()).filter((k) => k.length > 0))].sort().join(",");
}

/** AI template_fill 요청용 필드 설명 객체 */
export function buildAiTemplateFieldPayload(field: TemplateFieldEffective): {
  key: string;
  label: string;
  description?: string;
  valueType?: string;
  optionKeys?: string[];
} {
  const base: {
    key: string;
    label: string;
    description?: string;
    valueType?: string;
    optionKeys?: string[];
  } = {
    key: field.storageKey,
    label: field.label,
  };
  if (field.description?.trim()) base.description = field.description.trim();
  if (!isChoiceTemplateValueType(field.inputKind)) return base;
  base.valueType = field.inputKind;
  const keys =
    field.options && Object.keys(field.options).length > 0
      ? Object.keys(field.options).sort((a, b) => a.localeCompare(b, "ko"))
      : [];
  if (keys.length > 0) base.optionKeys = keys;
  return base;
}
