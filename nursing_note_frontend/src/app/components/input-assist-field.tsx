import { useInputAssist } from "@/app/hooks/use-input-assist";

interface InputAssistFieldProps {
  templateId: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  recentRecordContext?: string;
  className: string;
  rows?: number;
  multiline?: boolean;
  type?: "text" | "number";
  placeholder?: string;
  readOnly?: boolean;
  /** 저장 전 설정 편집 내용으로 약어·활성화를 덮어쓸 때(설정 화면 테스트용) */
  settingsOverride?: { enabled: boolean; entries: { trigger: string; replacement: string }[] } | null;
}

export function InputAssistField({
  templateId,
  fieldKey,
  value,
  onChange,
  recentRecordContext,
  className,
  rows,
  multiline = false,
  type = "text",
  placeholder,
  readOnly = false,
  settingsOverride = null,
}: InputAssistFieldProps) {
  const { ghostSuggestion, handleInputKeyDown } = useInputAssist({
    templateId,
    fieldKey,
    currentText: value,
    recentRecordContext,
    disabled: readOnly || type === "number",
    settingsOverride,
  });

  if (multiline) {
    return (
      <div>
        <textarea
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (readOnly) return;
            handleInputKeyDown(event, value, onChange);
          }}
          rows={rows}
          placeholder={placeholder}
          className={className}
        />
        {ghostSuggestion ? (
          <p className="mt-1 truncate text-xs text-gray-400">
            {value}
            <span className="text-gray-400/80">{ghostSuggestion}</span>
            <span className="ml-1 text-gray-400/60">(Tab)</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (readOnly) return;
          handleInputKeyDown(event, value, onChange);
        }}
        placeholder={placeholder}
        className={className}
      />
      {ghostSuggestion && type !== "number" ? (
        <p className="mt-1 truncate text-xs text-gray-400">
          {value}
          <span className="text-gray-400/80">{ghostSuggestion}</span>
          <span className="ml-1 text-gray-400/60">(Tab)</span>
        </p>
      ) : null}
    </div>
  );
}
