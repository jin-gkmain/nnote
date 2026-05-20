import { X } from "lucide-react";
import type { VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";

interface SelectVoiceRecordTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 서버/기본에서 온 템플릿 id 목록(표시 문자열과 동일) */
  templates: string[];
  selectedTemplateIds: VoiceRecordTemplateId[];
  maxCount: number;
  onAddTemplate: (id: VoiceRecordTemplateId) => void;
  /** 녹음·생성 중 등 목록 조작 불가 */
  disabled?: boolean;
}

/**
 * 음성기록: 기록지(템플릿)를 모달 목록에서 탭해 선택 목록에 추가
 * — 이미 선택된 행·최대 개수 도달 시 나머지 행은 비활성
 */
export default function SelectVoiceRecordTemplatesModal({
  isOpen,
  onClose,
  templates,
  selectedTemplateIds,
  maxCount,
  onAddTemplate,
  disabled = false,
}: SelectVoiceRecordTemplatesModalProps) {
  if (!isOpen) return null;

  const atMax = selectedTemplateIds.length >= maxCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-template-modal-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2
            id="voice-template-modal-title"
            className="text-lg font-bold text-gray-900"
          >
            기록지 선택
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="닫기"
          >
            <X className="h-7 w-7" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th
                    scope="col"
                    className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-700"
                  >
                    기록지
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td
                      className="border border-gray-200 px-4 py-8 text-center text-gray-500"
                    >
                      사용 가능한 기록지가 없습니다.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => {
                    const tid = template as VoiceRecordTemplateId;
                    const isSelected = selectedTemplateIds.includes(tid);
                    const rowDisabled =
                      disabled || isSelected || (atMax && !isSelected);

                    const rowClass = [
                      "transition-colors",
                      isSelected ? "bg-blue-50" : "bg-white",
                      !rowDisabled
                        ? "cursor-pointer hover:bg-blue-50/70"
                        : "cursor-not-allowed",
                    ].join(" ");

                    const labelClass = isSelected
                      ? "font-medium text-blue-900"
                      : rowDisabled
                        ? "text-gray-400"
                        : "font-medium text-gray-900";

                    return (
                      <tr
                        key={template}
                        className={rowClass}
                        role={rowDisabled ? undefined : "button"}
                        tabIndex={rowDisabled ? undefined : 0}
                        onClick={() => {
                          if (rowDisabled) return;
                          onAddTemplate(tid);
                        }}
                        onKeyDown={(e) => {
                          if (rowDisabled) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onAddTemplate(tid);
                          }
                        }}
                      >
                        <td
                          className={`border border-gray-200 px-4 py-3 ${labelClass}`}
                        >
                          {template}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <p className="mb-3 text-center text-xs text-gray-500">
            {atMax
              ? `기록지는 최대 ${maxCount}개까지 선택할 수 있습니다. 칩에서 제거하면 다시 추가할 수 있습니다.`
              : `행을 눌러 추가합니다. (최대 ${maxCount}개)`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
