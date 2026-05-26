export const TEMPLATE_VALUE_TYPES = [
  "text_short",
  "text_long",
  "number",
  "date",
  "datetime",
  "boolean",
  "single_select",
  "multi_select",
  "computed",
  "image",
  "section_note",
] as const;

export type TemplateValueType = (typeof TEMPLATE_VALUE_TYPES)[number];
export type TemplateInputKind = TemplateValueType;

export interface TemplateFieldOption {
  optionKey: string;
  label: string;
  allowFreeText: boolean;
  displayOrder: number;
}

export interface TemplateFieldCondition {
  conditionType: "free_text_when_option";
  triggerFieldKey: string;
  triggerOptionKey: string;
  targetFieldKey: string;
}

export interface TemplateColumnDef {
  type: TemplateValueType;
  label?: string;
  description?: string;
  aiHint?: string;
  inputSources?: string[];
  sourceRow?: number;
  sourceDefinition?: string;
  options?: Record<string, string>;
  optionDetails?: TemplateFieldOption[];
  conditions?: TemplateFieldCondition[];
}

export type TemplateSectionMap = Record<string, Record<string, TemplateColumnDef>>;

export interface TemplateUiConfigMeta {
  templateId?: string;
  displayTitle?: string | null;
  title?: string;
  version?: number;
  sourceSheet?: string;
  institution?: string;
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

export interface TemplateFieldDefault {
  readonly storageKey: string;
  readonly label: string;
  readonly description?: string;
  readonly inputKind: TemplateInputKind;
  readonly unit?: string;
  readonly fullRow?: boolean;
  readonly options?: Readonly<Record<string, string>>;
  readonly optionDetails?: readonly TemplateFieldOption[];
  readonly conditions?: readonly TemplateFieldCondition[];
  readonly aiHint?: string;
  readonly inputSources?: readonly string[];
  readonly sourceRow?: number;
  readonly sourceDefinition?: string;
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
  options?: Record<string, string>;
  optionDetails?: TemplateFieldOption[];
  conditions?: TemplateFieldCondition[];
  aiHint?: string;
  inputSources?: string[];
  sourceRow?: number;
  sourceDefinition?: string;
}

interface TemplateApiListItem {
  templateId: string;
  title: string;
  version: number;
  sourceSheet: string;
  institution: string;
  isActive: boolean;
}

interface TemplateApiDetail extends TemplateApiListItem {
  sections: Array<{
    sectionKey: string;
    title: string;
    displayOrder: number;
    repeatable: boolean;
    fields: Array<{
      fieldKey: string;
      label: string;
      type: TemplateValueType;
      description?: string;
      aiHint?: string;
      inputSources?: string[];
      sourceRow?: number;
      sourceDefinition?: string;
      displayOrder: number;
      options?: TemplateFieldOption[];
      conditions?: TemplateFieldCondition[];
    }>;
  }>;
}

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

export function isChoiceTemplateValueType(type: TemplateValueType | string): boolean {
  return (
    type === "single_select" ||
    type === "multi_select" ||
    type === "radio" ||
    type === "checkbox" ||
    type === "selectbox"
  );
}

export function isValidRawTemplateValueType(raw: string): boolean {
  const v = String(raw).trim();
  return (
    v === "text" ||
    v === "radio" ||
    v === "checkbox" ||
    v === "selectbox" ||
    (TEMPLATE_VALUE_TYPES as readonly string[]).includes(v)
  );
}

export function normalizeStoredTemplateValueType(raw: string): TemplateValueType {
  const v = String(raw).trim();
  if (v === "text") return "text_long";
  if (v === "radio" || v === "selectbox") return "single_select";
  if (v === "checkbox") return "multi_select";
  if ((TEMPLATE_VALUE_TYPES as readonly string[]).includes(v)) {
    return v as TemplateValueType;
  }
  return "text_long";
}

function optionsObjectFromDetails(options: readonly TemplateFieldOption[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const option of options ?? []) {
    out[option.optionKey] = option.label === option.optionKey ? "" : option.label;
  }
  return out;
}

export function optionsObjectFromOptionDetails(
  options: readonly TemplateFieldOption[] | undefined,
): Record<string, string> | undefined {
  if (!options?.length) return undefined;
  return optionsObjectFromDetails(options);
}

export function normalizeTemplateFieldOptions(
  optionDetails: readonly TemplateFieldOption[] | undefined,
  options: Readonly<Record<string, string>> | undefined,
): TemplateFieldOption[] {
  if (optionDetails?.length) {
    return optionDetails
      .map((option, index) => {
        const optionKey = String(option.optionKey ?? "").trim();
        if (!optionKey) return null;
        return {
          optionKey,
          label: String(option.label ?? optionKey).trim() || optionKey,
          allowFreeText: Boolean(option.allowFreeText),
          displayOrder: Number(option.displayOrder ?? index + 1),
        };
      })
      .filter((option): option is TemplateFieldOption => Boolean(option))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return Object.entries(options ?? {})
    .map(([key, label], index) => {
      const optionKey = key.trim();
      if (!optionKey) return null;
      const labelText = String(label ?? "").trim();
      return {
        optionKey,
        label: labelText || optionKey,
        allowFreeText: false,
        displayOrder: index + 1,
      };
    })
    .filter((option): option is TemplateFieldOption => Boolean(option));
}

export function normalizeStoredSectionMap(value: unknown): TemplateSectionMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: TemplateSectionMap = {};
  let hasAny = false;
  for (const [sectionName, columns] of Object.entries(value as Record<string, unknown>)) {
    if (!columns || typeof columns !== "object" || Array.isArray(columns)) continue;
    out[sectionName] = {};
    for (const [columnName, raw] of Object.entries(columns as Record<string, unknown>)) {
      if (typeof raw === "string") {
        out[sectionName][columnName] = { type: normalizeStoredTemplateValueType(raw) };
        hasAny = true;
        continue;
      }
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const obj = raw as Record<string, unknown>;
      const type = normalizeStoredTemplateValueType(String(obj.type ?? "text_long"));
      const optionDetails = Array.isArray(obj.optionDetails)
        ? (obj.optionDetails as TemplateFieldOption[])
        : undefined;
      const options =
        optionDetails && optionDetails.length > 0
          ? optionsObjectFromDetails(optionDetails)
          : obj.options && typeof obj.options === "object" && !Array.isArray(obj.options)
            ? Object.fromEntries(
                Object.entries(obj.options as Record<string, unknown>).map(([k, v]) => [
                  k,
                  typeof v === "string" ? v : String(v ?? ""),
                ]),
              )
            : undefined;
      out[sectionName][columnName] = {
        type,
        description: typeof obj.description === "string" ? obj.description : undefined,
        aiHint: typeof obj.aiHint === "string" ? obj.aiHint : undefined,
        inputSources: Array.isArray(obj.inputSources) ? obj.inputSources.map(String) : undefined,
        sourceRow: Number.isFinite(Number(obj.sourceRow)) ? Number(obj.sourceRow) : undefined,
        sourceDefinition:
          typeof obj.sourceDefinition === "string" ? obj.sourceDefinition : undefined,
        options,
        optionDetails,
        conditions: Array.isArray(obj.conditions)
          ? (obj.conditions as TemplateFieldCondition[])
          : undefined,
      };
      hasAny = true;
    }
  }
  return hasAny ? out : null;
}

export function fallbackSectionMapFromTemplateDefaults(
  _templateId: string,
): TemplateSectionMap {
  return {
    "기본 항목": {
      content: { type: "text_long", description: "템플릿 정의를 불러오지 못했습니다." },
    },
  };
}

export function mergeTemplateFieldOverrides(
  _templateId: string,
  serverSections: TemplateSectionMap | null | undefined,
): TemplateFieldEffective[] {
  const fields: TemplateFieldEffective[] = [];
  for (const [sectionName, columns] of Object.entries(serverSections ?? {})) {
    for (const [index, [fieldKey, def]] of Object.entries(columns ?? {}).entries()) {
      fields.push({
        storageKey: fieldKey,
        label: `${sectionName} · ${def.label || `항목 ${index + 1}`}`,
        description: def.description ?? "",
        inputKind: def.type,
        hidden: false,
        options: def.options,
        optionDetails: def.optionDetails,
        conditions: def.conditions,
        aiHint: def.aiHint,
        inputSources: def.inputSources,
        sourceRow: def.sourceRow,
        sourceDefinition: def.sourceDefinition,
      });
    }
  }
  return fields;
}

export async function getMergedTemplateFields(
  templateId: string,
): Promise<TemplateFieldEffective[]> {
  const map = await fetchTemplateUiConfigMap();
  return mergeTemplateFieldOverrides(templateId, map[templateId]?.sections ?? null);
}

export type TemplateUiConfigMap = Record<string, TemplateUiConfigMeta>;

function apiDetailToMeta(detail: TemplateApiDetail): TemplateUiConfigMeta {
  const sections: TemplateSectionMap = {};
  for (const section of [...detail.sections].sort((a, b) => a.displayOrder - b.displayOrder)) {
    sections[section.title] = {};
    for (const field of [...section.fields].sort((a, b) => a.displayOrder - b.displayOrder)) {
      sections[section.title][field.fieldKey] = {
        type: normalizeStoredTemplateValueType(field.type),
        label: field.label,
        description: field.description ?? "",
        aiHint: field.aiHint ?? "",
        inputSources: field.inputSources ?? [],
        sourceRow: field.sourceRow ?? 0,
        sourceDefinition: field.sourceDefinition ?? "",
        options: optionsObjectFromDetails(field.options ?? []),
        optionDetails: field.options ?? [],
        conditions: field.conditions ?? [],
      };
    }
  }
  return {
    templateId: detail.templateId,
    displayTitle: detail.title,
    title: detail.title,
    version: detail.version,
    sourceSheet: detail.sourceSheet,
    institution: detail.institution,
    sections,
    createdAt: null,
    updatedAt: null,
  };
}

export async function fetchTemplateUiConfigMap(): Promise<TemplateUiConfigMap> {
  try {
    const res = await fetch("/api/templates");
    if (!res.ok) return {};
    const list = (await res.json()) as TemplateApiListItem[];
    const details = await Promise.all(
      list.map(async (item) => {
        const detailRes = await fetch(`/api/templates/${encodeURIComponent(item.templateId)}`);
        if (!detailRes.ok) return null;
        return (await detailRes.json()) as TemplateApiDetail;
      }),
    );
    const map: TemplateUiConfigMap = {};
    for (const detail of details) {
      if (!detail) continue;
      map[detail.templateId] = apiDetailToMeta(detail);
    }
    return map;
  } catch {
    return {};
  }
}

export async function fetchTemplateSectionPresets(_token: string): Promise<TemplateSectionPreset[]> {
  return [];
}

export function fieldConfigsToSectionMap(fields: TemplateUiFieldConfig[]): TemplateSectionMap {
  const sectionName = "기본 항목";
  const section: Record<string, TemplateColumnDef> = {};
  for (const field of fields) {
    if (field.hidden) continue;
    section[field.storageKey] = {
      type: field.inputKind,
      label: splitTemplateLabel(field.label).field,
      description: field.description,
      options: optionsObjectFromOptionDetails(field.optionDetails) ?? field.options,
      optionDetails: normalizeTemplateFieldOptions(field.optionDetails, field.options),
      conditions: field.conditions,
      aiHint: field.aiHint,
      inputSources: field.inputSources,
      sourceRow: field.sourceRow,
      sourceDefinition: field.sourceDefinition,
    };
  }
  return { [sectionName]: section };
}

export function invalidateTemplateUiConfigCache(): void {}

export function textareaRowsForKind(kind: TemplateInputKind): number {
  if (kind === "text_long") return 6;
  if (kind === "section_note") return 2;
  return 2;
}

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

export function coerceDateInputValue(raw: string): string {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

export function parseCheckboxCsvToKeys(raw: string, allowedKeys: readonly string[]): string[] {
  const allowed = new Set(allowedKeys);
  const parts = String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return [...new Set(parts.filter((p) => allowed.has(p)))].sort();
}

export function serializeCheckboxKeysToCsv(keys: readonly string[]): string {
  return [...new Set(keys.map((k) => k.trim()).filter((k) => k.length > 0))].sort().join(",");
}

export function buildAiTemplateFieldPayload(field: TemplateFieldEffective): {
  key: string;
  label: string;
  description?: string;
  valueType?: string;
  optionKeys?: string[];
  options?: TemplateFieldOption[];
  allowFreeText?: boolean;
  conditions?: readonly TemplateFieldCondition[];
  inputSources?: readonly string[];
  aiHint?: string;
  sourceDefinition?: string;
} {
  const optionKeys = field.optionDetails?.map((option) => option.optionKey) ??
    Object.keys(field.options ?? {});
  const payload: ReturnType<typeof buildAiTemplateFieldPayload> = {
    key: field.storageKey,
    label: field.label,
    valueType: field.inputKind,
  };
  if (field.description?.trim()) payload.description = field.description.trim();
  if (optionKeys.length > 0) payload.optionKeys = optionKeys;
  if (field.optionDetails?.length) {
    payload.options = field.optionDetails.map((option) => ({ ...option }));
    payload.allowFreeText = field.optionDetails.some((option) => option.allowFreeText);
  }
  if (field.conditions?.length) payload.conditions = field.conditions;
  if (field.inputSources?.length) payload.inputSources = field.inputSources;
  if (field.aiHint?.trim()) payload.aiHint = field.aiHint.trim();
  if (field.sourceDefinition?.trim()) payload.sourceDefinition = field.sourceDefinition.trim();
  return payload;
}
