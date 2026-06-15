import { useEffect, useMemo, useState } from "react";
import type { VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";
import { buildRecordPayload } from "@/app/data/recordPayload";
import {
  buildDefaultRecordTitle,
  classificationLabelForTemplate,
} from "@/app/data/recordTitle";
import {
  buildHintContextText,
  buildStructuredHintsFromTemplate,
} from "@/app/data/ai-template-matcher";
import { buildAiTemplateFieldPayload, splitTemplateLabel, type TemplateFieldEffective } from "@/app/data/template-field-registry";
import {
  useAiDraftMutation,
  useCreateRecordMutation,
  useMergedTemplateFieldsQuery,
  useOcrMutation,
  useTemplatesMapQuery,
} from "@/app/query/use-app-query";
import { TemplateFieldControl } from "@/app/components/template-field-control";

const SUPPORTED_EXTENSIONS = "JPG, JPEG, PNG, PDF";
const MAX_FILE_SIZE_MB = 10;

export default function OcrPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<VoiceRecordTemplateId>("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});
  const [modalFieldLayout, setModalFieldLayout] = useState<TemplateFieldEffective[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isFillingFromAi, setIsFillingFromAi] = useState(false);
  const [ocrRecordTitle, setOcrRecordTitle] = useState("");
  const ocrMutation = useOcrMutation();
  const aiDraftMutation = useAiDraftMutation<Record<string, string>>();
  const createRecordMutation = useCreateRecordMutation();
  const mergedTemplateQuery = useMergedTemplateFieldsQuery(selectedTemplate);
  const templatesMapQuery = useTemplatesMapQuery();
  const availableTemplates = useMemo(() => {
    return Object.keys(templatesMapQuery.data ?? {});
  }, [templatesMapQuery.data]);

  useEffect(() => {
    if (availableTemplates.length === 0) {
      setSelectedTemplate("");
      return;
    }
    setSelectedTemplate((previous) =>
      previous && availableTemplates.includes(previous)
        ? previous
        : availableTemplates[0]!,
    );
  }, [availableTemplates]);

  const selectedFileSummary = useMemo(() => {
    if (!selectedFile) return "선택된 파일이 없습니다.";
    const sizeInKb = Math.max(1, Math.round(selectedFile.size / 1024));
    return `${selectedFile.name} (${sizeInKb} KB)`;
  }, [selectedFile]);

  function handleSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setSelectedFile(null);
      setScanResult("");
      setError("");
      return;
    }
    if (!nextFile.type.startsWith("image/") && nextFile.type !== "application/pdf") {
      setError("이미지 또는 PDF 파일만 업로드 가능합니다.");
      setSelectedFile(null);
      setScanResult("");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하만 가능합니다.`);
      setSelectedFile(null);
      setScanResult("");
      return;
    }
    setSelectedFile(nextFile);
    setScanResult("");
    setError("");
    setCopied(false);
    setGenerationMessage("");
  }

  async function handleScanFile() {
    if (!selectedFile) {
      setScanResult("파일을 먼저 선택해 주세요.");
      return;
    }
    setIsScanning(true);
    setError("");
    setScanResult("");
    try {
      const text = await ocrMutation.mutateAsync(selectedFile);
      setScanResult(text);
      setCopied(false);
      setGenerationMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "서버 연결에 실패했습니다.");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCopyResult() {
    if (!scanResult) return;
    await navigator.clipboard.writeText(scanResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl("");
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  async function openTemplateModal() {
    if (!scanResult.trim()) return;
    if (!selectedTemplate) {
      setGenerationMessage("사용할 기록지 템플릿을 선택해 주세요.");
      return;
    }
    setIsFillingFromAi(true);
    setGenerationMessage("");
    const merged = mergedTemplateQuery.data ?? [];
    const visible = merged.filter((f) => !f.hidden);
    setModalFieldLayout(visible);
    const emptyFields = createEmptyFromFields(visible);
    try {
      const structuredHints = buildStructuredHintsFromTemplate(visible, scanResult.trim());
      const hintContext = buildHintContextText(structuredHints);
      const result = await aiDraftMutation.mutateAsync({
        text: hintContext ? `${scanResult.trim()}\n\n${hintContext}` : scanResult.trim(),
        type: "template_fill",
        templateFields: visible.map((d) => buildAiTemplateFieldPayload(d)),
        structuredHints,
      });
      const mergedFields = { ...emptyFields, ...result };
      setTemplateFields(mergedFields);
      {
        const keys = visible.map((d) => d.storageKey);
        const { recordDate, recordTime } = buildRecordPayload(mergedFields, selectedTemplate, {
          allowUnknownFormType: true,
          templateFieldKeys: keys,
        });
        setOcrRecordTitle(
          buildDefaultRecordTitle({
            classificationLabel: classificationLabelForTemplate(
              selectedTemplate,
              templatesMapQuery.data,
            ),
            recordDate,
            recordTime,
          }),
        );
      }
      setIsTemplateModalOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "AI가 필드를 채우지 못했습니다. 원문을 첫 항목에만 넣었습니다.";
      setGenerationMessage(msg);
      const initialFields = createInitialFromFields(visible, scanResult);
      setTemplateFields(initialFields);
      {
        const keys = visible.map((d) => d.storageKey);
        const { recordDate, recordTime } = buildRecordPayload(initialFields, selectedTemplate, {
          allowUnknownFormType: true,
          templateFieldKeys: keys,
        });
        setOcrRecordTitle(
          buildDefaultRecordTitle({
            classificationLabel: classificationLabelForTemplate(
              selectedTemplate,
              templatesMapQuery.data,
            ),
            recordDate,
            recordTime,
          }),
        );
      }
      setIsTemplateModalOpen(true);
    } finally {
      setIsFillingFromAi(false);
    }
  }

  async function handleSaveTemplate() {
    const title = ocrRecordTitle.trim().slice(0, 512);
    if (!title) {
      setGenerationMessage("기록 제목을 입력해 주세요.");
      return;
    }
    setIsSavingTemplate(true);
    try {
      const content = { ...templateFields };
      const templateFieldKeys = modalFieldLayout.map((field) => field.storageKey);
      const { documentNumber, recordDate, recordTime, data } = buildRecordPayload(
        content,
        selectedTemplate,
        { allowUnknownFormType: true, templateFieldKeys },
      );
      const dataWithOcrMeta: Record<string, unknown> = {
        ...data,
        스캔원문: scanResult.trim(),
        스캔저장시각: new Date().toISOString(),
      };
      await createRecordMutation.mutateAsync({
        body: {
          recordType: selectedTemplate,
          documentNumber,
          recordDate,
          recordTime,
          title,
          data: dataWithOcrMeta,
          creationSource: "ocr",
        },
      });
      setGenerationMessage("기록이 저장되었습니다.");
      setIsTemplateModalOpen(false);
    } catch {
      setGenerationMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function handleEmrSend() {
    setGenerationMessage("EMR 전송 요청이 접수되었습니다. (연동 준비 중)");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[720px] flex-col text-left lg:max-w-none">
      <h1 className="mb-5 text-[28px] font-bold leading-tight text-[#111827] sm:mb-6 sm:text-3xl">
        OCR
      </h1>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-7 lg:grid-cols-[4fr_6fr] lg:gap-8">
        <section className="flex min-h-0 min-w-0 flex-col lg:rounded-xl lg:border lg:border-[#E5E7EB] lg:bg-white lg:p-5 lg:shadow-[0_2px_8px_rgba(17,24,39,0.08)]">
          <h2 className="text-base font-bold text-gray-900 lg:text-sm lg:font-semibold">파일 선택</h2>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 lg:mt-4 lg:border-dashed lg:bg-gray-50">
            <label
              htmlFor="ocr-file-input"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              파일 업로드
            </label>
            <input
              id="ocr-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={handleSelectFile}
              className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="mt-4 min-h-[180px] max-h-[360px] rounded-lg border border-gray-200 bg-white p-3 lg:bg-gray-50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="선택한 파일 미리보기"
                className="h-full max-h-[260px] w-full rounded-md object-contain"
              />
            ) : (
              <div className="flex h-full min-h-[150px] items-center justify-center text-sm text-gray-500">
                이미지 파일 선택 시 미리보기가 표시됩니다.
              </div>
            )}
          </div>
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={handleScanFile}
              disabled={isScanning}
              className="h-12 w-full rounded-[5px] bg-[#3B82F6] text-sm font-bold text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isScanning ? "스캔 중..." : "스캔하기"}
            </button>
          </div>
        </section>
        <section className="flex min-h-0 min-w-0 flex-col border-t border-[#E5E7EB] pt-6 lg:rounded-xl lg:border lg:bg-white lg:p-5 lg:shadow-[0_2px_8px_rgba(17,24,39,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 lg:text-sm lg:font-semibold">
              스캔 결과
            </h2>
            <button
              type="button"
              onClick={handleCopyResult}
              disabled={!scanResult}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {copied ? "복사됨" : "복사하기"}
            </button>
          </div>
          <textarea
            readOnly
            value={scanResult}
            placeholder="스캔하기 버튼을 누르면 결과가 표시됩니다."
            className="min-h-[220px] w-full flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 lg:min-h-[360px] lg:bg-gray-50 lg:px-4"
          />
          {scanResult.trim() ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-800">템플릿 선택</p>
              {templatesMapQuery.error ? (
                <p className="mb-3 text-sm text-red-600">
                  {templatesMapQuery.error instanceof Error
                    ? templatesMapQuery.error.message
                    : "템플릿을 불러오지 못했습니다."}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={selectedTemplate}
                  disabled={templatesMapQuery.isLoading || availableTemplates.length === 0}
                  onChange={(event) =>
                    setSelectedTemplate(event.target.value as VoiceRecordTemplateId)
                  }
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 sm:flex-1"
                >
                  {availableTemplates.map((template) => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void openTemplateModal()}
                  disabled={isFillingFromAi || !selectedTemplate}
                  className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isFillingFromAi ? "AI 생성 중..." : "생성하기"}
                </button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {generationMessage ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {generationMessage}
            </p>
          ) : null}
        </section>
      </div>
      {isTemplateModalOpen ? (
        <TemplateGenerateModal
          selectedTemplate={selectedTemplate}
          editorFields={modalFieldLayout}
          fields={templateFields}
          recordTitle={ocrRecordTitle}
          onRecordTitleChange={setOcrRecordTitle}
          onChangeField={(fieldKey, value) =>
            setTemplateFields((previous) => ({ ...previous, [fieldKey]: value }))
          }
          isSaving={isSavingTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
          onSave={handleSaveTemplate}
          onEmrSend={handleEmrSend}
        />
      ) : null}
    </div>
  );
}

interface TemplateGenerateModalProps {
  selectedTemplate: VoiceRecordTemplateId;
  editorFields: TemplateFieldEffective[];
  fields: Record<string, string>;
  recordTitle: string;
  onRecordTitleChange: (value: string) => void;
  onChangeField: (fieldKey: string, value: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onEmrSend: () => void;
}

function TemplateGenerateModal({
  selectedTemplate,
  editorFields,
  fields,
  recordTitle,
  onRecordTitleChange,
  onChangeField,
  isSaving,
  onClose,
  onSave,
  onEmrSend,
}: TemplateGenerateModalProps) {
  const groupedFields = useMemo(() => {
    const groups = new Map<string, TemplateFieldEffective[]>();
    editorFields.forEach((field) => {
      const { section } = splitTemplateLabel(field.label);
      const existing = groups.get(section) ?? [];
      existing.push(field);
      groups.set(section, existing);
    });
    return [...groups.entries()].map(([section, fields]) => ({ section, fields }));
  }, [editorFields]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-lg sm:max-h-[90vh] sm:rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 p-4 sm:p-5">
          <h3 className="text-base font-bold text-gray-900">
            {selectedTemplate} 생성
          </h3>
          <button
            type="button"
            onClick={onEmrSend}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            EMR전송
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5 [-webkit-overflow-scrolling:touch]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">기록 제목</span>
            <input
              type="text"
              value={recordTitle}
              onChange={(e) => onRecordTitleChange(e.target.value)}
              maxLength={512}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900"
            />
          </label>
          {groupedFields.map(({ section, fields: sectionFields }) => (
            <section
              key={section}
              className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4"
            >
              <h4 className="mb-3 text-xs font-semibold text-gray-700">{section}</h4>
              <div className="space-y-3">
                {sectionFields.map((field) => {
                  const unitSuffix = field.unit?.trim() ? ` (${field.unit})` : "";
                  const { field: fieldLabel } = splitTemplateLabel(field.label);
                  return (
                    <div key={field.storageKey}>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {fieldLabel}
                        {unitSuffix}
                      </label>
                      <TemplateFieldControl
                        field={field}
                        templateId={selectedTemplate}
                        value={fields[field.storageKey] ?? ""}
                        onChange={(nextValue) => onChangeField(field.storageKey, nextValue)}
                        classNameInputShort="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900"
                        classNameTextarea="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createEmptyFromFields(fields: TemplateFieldEffective[]): Record<string, string> {
  const initialFields: Record<string, string> = {};
  for (const field of fields) {
    initialFields[field.storageKey] = "";
  }
  return initialFields;
}

function createInitialFromFields(
  fields: TemplateFieldEffective[],
  scanResult: string,
): Record<string, string> {
  const initialFields = createEmptyFromFields(fields);
  if (fields[0]) initialFields[fields[0].storageKey] = scanResult;
  return initialFields;
}
