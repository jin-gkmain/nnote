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
  patientId?: number | null;
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
  patientId,
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

  if (kind === "number") {
    return (
      <InputAssistField
        templateId={templateId}
        fieldKey={field.storageKey}
        patientId={patientId}
        type="number"
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        className={classNameInputShort}
      />
    );
  }

  if (kind === "selectbox") {
    const entries = Object.entries(field.options ?? {}).sort(([a], [b]) =>
      a.localeCompare(b, "ko"),
    );
    const current = value.trim();
    const valid = entries.some(([k]) => k === current);
    const selectVal = valid ? current : "";
    return (
      <select
        disabled={readOnly || entries.length === 0}
        value={selectVal}
        onChange={(e) => onChange(e.target.value)}
        className={classNameInputShort}
      >
        <option value="">— (선택)</option>
        {entries.map(([optKey, hint]) => (
          <option key={optKey} value={optKey}>
            {hint ? `${optKey} (${hint})` : optKey}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "radio") {
    const entries = Object.entries(field.options ?? {}).sort(([a], [b]) =>
      a.localeCompare(b, "ko"),
    );
    const name = `radio-${templateId}-${field.storageKey}`;
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
        {entries.map(([optKey, hint]) => (
          <label key={optKey} className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
            <input
              type="radio"
              name={name}
              disabled={readOnly}
              checked={value.trim() === optKey}
              onChange={() => onChange(optKey)}
              className="h-4 w-4"
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

  if (kind === "checkbox") {
    const entries = Object.entries(field.options ?? {}).sort(([a], [b]) =>
      a.localeCompare(b, "ko"),
    );
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
        patientId={patientId}
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
      patientId={patientId}
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      className={classNameInputShort}
    />
  );
}
