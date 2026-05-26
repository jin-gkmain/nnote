import { InputAssistField } from "@/app/components/input-assist-field";
import {
  BOOLEAN_FIELD_EMPTY,
  BOOLEAN_FIELD_NO,
  BOOLEAN_FIELD_YES,
  coerceDateInputValue,
  normalizeBooleanFieldValue,
  parseCheckboxCsvToKeys,
  serializeCheckboxKeysToCsv,
  textareaRowsForKind,
  type TemplateFieldEffective,
} from "@/app/data/template-field-registry";

export interface TemplateFieldControlProps {
  field: TemplateFieldEffective;
  templateId: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  /** 단일행·숫자 등에 쓰는 클래스 */
  classNameInputShort?: string;
  /** textarea에 쓰는 클래스 */
  classNameTextarea?: string;
}

export function TemplateFieldControl({
  field,
  templateId,
  value,
  onChange,
  readOnly = false,
  classNameInputShort = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30",
  classNameTextarea = "min-h-[72px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 sm:min-h-[96px]",
}: TemplateFieldControlProps) {
  const kind = field.inputKind;

  if (kind === "boolean") {
    const selectValue = normalizeBooleanFieldValue(value);
    return (
      <select
        value={
          selectValue === BOOLEAN_FIELD_YES
            ? BOOLEAN_FIELD_YES
            : selectValue === BOOLEAN_FIELD_NO
              ? BOOLEAN_FIELD_NO
              : BOOLEAN_FIELD_EMPTY
        }
        disabled={readOnly}
        onChange={(e) => {
          const v = e.target.value;
          if (v === BOOLEAN_FIELD_YES || v === BOOLEAN_FIELD_NO) onChange(v);
          else onChange(BOOLEAN_FIELD_EMPTY);
        }}
        className={classNameInputShort}
      >
        <option value={BOOLEAN_FIELD_EMPTY}>— (공백)</option>
        <option value={BOOLEAN_FIELD_YES}>예 (YES)</option>
        <option value={BOOLEAN_FIELD_NO}>아니오 (NO)</option>
      </select>
    );
  }

  if (kind === "computed" || kind === "section_note") {
    return (
      <textarea
        readOnly
        value={value || field.sourceDefinition || field.aiHint || ""}
        className={`${classNameTextarea} bg-gray-50 text-gray-600`}
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
        이미지/사진 입력 항목입니다. 현재 화면에서는 메모 값으로 저장됩니다.
        <InputAssistField
          templateId={templateId}
          fieldKey={field.storageKey}
          patientId={patientId}
          multiline
          rows={3}
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          className={`${classNameTextarea} mt-3 bg-white`}
        />
      </div>
    );
  }

  if (kind === "date") {
    return (
      <input
        type="date"
        readOnly={readOnly}
        value={coerceDateInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
        className={classNameInputShort}
      />
    );
  }

  if (kind === "datetime") {
    return (
      <input
        type="datetime-local"
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={classNameInputShort}
      />
    );
  }

  if (kind === "number") {
    return (
      <InputAssistField
        templateId={templateId}
        fieldKey={field.storageKey}
        type="number"
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        className={classNameInputShort}
      />
    );
  }

  if (kind === "single_select") {
    const parsedValue = parseSingleSelectValue(value);
    const entries = (field.optionDetails?.length
      ? field.optionDetails.map((option) => [option.optionKey, option.label, option.allowFreeText] as const)
      : Object.entries(field.options ?? {}).map(([k, v]) => [k, v || k, false] as const)
    ).sort(([a], [b]) => a.localeCompare(b, "ko"));
    const current = parsedValue.selected;
    const valid = entries.some(([k]) => k === current);
    const selectVal = valid ? current : "";
    const selectedAllowsFreeText = entries.some(
      ([optKey, _label, allowFreeText]) => allowFreeText && optKey === selectVal,
    );
    return (
      <div className="space-y-2">
        <select
          disabled={readOnly || entries.length === 0}
          value={selectVal}
          onChange={(e) => {
            const nextSelected = e.target.value;
            const allowsFreeText = entries.some(
              ([optKey, _label, allowFreeText]) => allowFreeText && optKey === nextSelected,
            );
            onChange(allowsFreeText ? serializeSingleSelectValue(nextSelected, "") : nextSelected);
          }}
          className={classNameInputShort}
        >
          <option value="">— (선택)</option>
          {entries.map(([optKey, label]) => (
            <option key={optKey} value={optKey}>
              {label || optKey}
            </option>
          ))}
        </select>
        {selectedAllowsFreeText ? (
          <InputAssistField
            templateId={templateId}
            fieldKey={`${field.storageKey}_free_text`}
            patientId={patientId}
            readOnly={readOnly}
            value={parsedValue.freeText}
            onChange={(next) => onChange(serializeSingleSelectValue(selectVal, next))}
            className={classNameInputShort}
          />
        ) : null}
      </div>
    );
  }

  if (kind === "multi_select") {
    const entries = (field.optionDetails?.length
      ? field.optionDetails.map((option) => [option.optionKey, option.label] as const)
      : Object.entries(field.options ?? {}).map(([k, v]) => [k, v || k] as const)
    ).sort(([a], [b]) => a.localeCompare(b, "ko"));
    const keys = entries.map(([k]) => k);
    const selected = new Set(parseCheckboxCsvToKeys(value, keys));
    return (
      <div className="flex flex-col gap-2">
        {entries.map(([optKey, hint]) => (
          <label key={optKey} className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={selected.has(optKey)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(optKey);
                else next.delete(optKey);
                onChange(serializeCheckboxKeysToCsv([...next]));
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>{hint ? `${optKey} (${hint})` : optKey}</span>
          </label>
        ))}
        {entries.length === 0 ? (
          <span className="text-xs text-gray-500">선택지가 없습니다.</span>
        ) : null}
      </div>
    );
  }

  if (kind === "text_long") {
    return (
      <InputAssistField
        templateId={templateId}
        fieldKey={field.storageKey}
        multiline
        rows={textareaRowsForKind(kind)}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        className={classNameTextarea}
      />
    );
  }

  /* text_short */
  return (
    <InputAssistField
      templateId={templateId}
      fieldKey={field.storageKey}
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      className={classNameInputShort}
    />
  );
}

function parseSingleSelectValue(value: string): { selected: string; freeText: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return { selected: trimmed, freeText: "" };
  try {
    const parsed = JSON.parse(trimmed) as { selected?: unknown; freeText?: unknown };
    return {
      selected: typeof parsed.selected === "string" ? parsed.selected : "",
      freeText: typeof parsed.freeText === "string" ? parsed.freeText : "",
    };
  } catch {
    return { selected: trimmed, freeText: "" };
  }
}

function serializeSingleSelectValue(selected: string, freeText: string): string {
  if (!selected) return "";
  return JSON.stringify({ selected, freeText });
}
