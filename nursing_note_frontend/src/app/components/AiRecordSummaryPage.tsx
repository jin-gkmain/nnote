import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TemplateFieldControl } from "@/app/components/template-field-control";
import { RecordDetailOverlay } from "@/app/components/record-detail-overlay";
import { buildHintContextText, buildStructuredHintsFromTemplate } from "@/app/data/ai-template-matcher";
import { buildRecordPayload } from "@/app/data/recordPayload";
import {
  buildDefaultRecordTitle,
  classificationLabelForTemplate,
} from "@/app/data/recordTitle";
import type { DashboardRecordRow, RecordDetailResponse } from "@/app/data/nursingRecords";
import { fetchRecordById, toRecordDate, toRecordTime } from "@/app/data/nursingRecords";
import { VOICE_RECORD_TEMPLATES, type VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";
import { buildAiTemplateFieldPayload, splitTemplateLabel } from "@/app/data/template-field-registry";
import { queryKeys } from "@/app/query/query-keys";
import {
  useAiDraftMutation,
  useCreateRecordMutation,
  useMergedSummaryRecordsQuery,
  useMergedTemplateFieldsQuery,
  useTemplatesMapQuery,
} from "@/app/query/use-app-query";

function buildRecordText(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      const text =
        value != null && typeof value === "object"
          ? JSON.stringify(value)
          : String(value ?? "");
      return `${key}: ${text}`;
    })
    .join("\n");
}

function buildSummaryPrompt(row: DashboardRecordRow, record: RecordDetailResponse): string {
  return `[Source record metadata]
RecordType: ${row.recordType}
Title: ${row.title}
DocumentNo: ${row.documentNumber}
RecordDateTime: ${row.recordDateTime}

[Source record text]
${buildRecordText(record.data)}`;
}

export default function AiRecordSummaryPage() {
  const queryClient = useQueryClient();
  const mergedRecordsQuery = useMergedSummaryRecordsQuery(50);
  const templatesMapQuery = useTemplatesMapQuery();
  const aiDraftMutation = useAiDraftMutation<Record<string, unknown>>();
  const createRecordMutation = useCreateRecordMutation();

  const templateOptions = useMemo(() => {
    const ids = Object.keys(templatesMapQuery.data ?? {});
    if (templatesMapQuery.isSuccess && ids.length === 0) return [];
    return ids.length > 0 ? ids : [...VOICE_RECORD_TEMPLATES];
  }, [templatesMapQuery.data, templatesMapQuery.isSuccess]);

  const [templateId, setTemplateId] = useState<VoiceRecordTemplateId>(VOICE_RECORD_TEMPLATES[0]);
  const templateFieldsQuery = useMergedTemplateFieldsQuery(templateId);
  const visibleTemplateFields = (templateFieldsQuery.data ?? []).filter((f) => !f.hidden);
  const groupedTemplateFields = useMemo(() => {
    const groups = new Map<string, typeof visibleTemplateFields>();
    visibleTemplateFields.forEach((field) => {
      const { section } = splitTemplateLabel(field.label);
      const existing = groups.get(section) ?? [];
      existing.push(field);
      groups.set(section, existing);
    });
    return [...groups.entries()].map(([section, fields]) => ({ section, fields }));
  }, [visibleTemplateFields]);

  const [selectedRow, setSelectedRow] = useState<DashboardRecordRow | null>(null);
  const [draftContent, setDraftContent] = useState<Record<string, unknown> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const [summaryRecordTitle, setSummaryRecordTitle] = useState("");
  const [summaryTitleGen, setSummaryTitleGen] = useState(0);
  const summaryTitleSessionRef = useRef("");

  const rows = mergedRecordsQuery.data ?? [];
  const listLoading = mergedRecordsQuery.isLoading || mergedRecordsQuery.isFetching;
  const selectClass =
    "h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30";

  useEffect(() => {
    if (!selectedRow || !draftContent) {
      setSummaryRecordTitle("");
      summaryTitleSessionRef.current = "";
      return;
    }
    const sessionKey = `${summaryTitleGen}|${selectedRow.id}|${templateId}`;
    if (sessionKey === summaryTitleSessionRef.current) {
      return;
    }
    summaryTitleSessionRef.current = sessionKey;
    try {
      const contentForPayload = { ...draftContent };
      if (typeof contentForPayload.date === "string") {
        contentForPayload.date = toRecordDate(contentForPayload.date);
      }
      if (typeof contentForPayload.time === "string") {
        contentForPayload.time = toRecordTime(contentForPayload.time);
      }
      const { recordDate, recordTime } = buildRecordPayload(
        contentForPayload,
        templateId,
        {
          allowUnknownFormType: true,
          templateFieldKeys: visibleTemplateFields.map((f) => f.storageKey),
        },
      );
      setSummaryRecordTitle(
        buildDefaultRecordTitle({
          classificationLabel: classificationLabelForTemplate(
            templateId,
            templatesMapQuery.data,
          ),
          recordDate,
          recordTime,
        }),
      );
    } catch {
      setSummaryRecordTitle("");
    }
  }, [
    summaryTitleGen,
    selectedRow,
    draftContent,
    templateId,
    templatesMapQuery.data,
    visibleTemplateFields,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!selectedRow) {
      setError("기준 기록을 선택해 주세요.");
      return;
    }
    if (visibleTemplateFields.length === 0) {
      setError("선택한 템플릿 필드가 없습니다.");
      return;
    }
    setError("");
    setMessage("");
    setIsGenerating(true);
    setDraftContent(null);
    try {
      const sourceRecord = await queryClient.fetchQuery({
        queryKey: queryKeys.records.detail(selectedRow.id),
        queryFn: () => fetchRecordById(selectedRow.id),
      });
      const prompt = buildSummaryPrompt(selectedRow, sourceRecord);
      const structuredHints = buildStructuredHintsFromTemplate(visibleTemplateFields, prompt);
      const hintContext = buildHintContextText(structuredHints);
      const data = await aiDraftMutation.mutateAsync({
        text: hintContext ? `${prompt}\n\n${hintContext}` : prompt,
        type: "template_fill",
        templateFields: visibleTemplateFields.map((f) => buildAiTemplateFieldPayload(f)),
        structuredHints,
      });
      const next: Record<string, unknown> = {};
      for (const field of visibleTemplateFields) {
        next[field.storageKey] = String(data[field.storageKey] ?? "");
      }
      setDraftContent(next);
      setSummaryTitleGen((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 기반 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }, [aiDraftMutation, queryClient, selectedRow, visibleTemplateFields]);

  const handleSave = useCallback(async () => {
    if (!selectedRow || !draftContent) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const contentForPayload = { ...draftContent };
      if (typeof contentForPayload.date === "string") {
        contentForPayload.date = toRecordDate(contentForPayload.date);
      }
      if (typeof contentForPayload.time === "string") {
        contentForPayload.time = toRecordTime(contentForPayload.time);
      }
      const { documentNumber, recordDate, recordTime, data } = buildRecordPayload(
        contentForPayload,
        templateId,
        {
          allowUnknownFormType: true,
          templateFieldKeys: visibleTemplateFields.map((f) => f.storageKey),
        },
      );
      const dataWithMeta: Record<string, unknown> = {
        ...data,
        생성근거기록Id: selectedRow.id,
        생성근거문서번호: selectedRow.documentNumber,
        생성유형: "record_based_template_fill",
      };
      const title = summaryRecordTitle.trim().slice(0, 512);
      if (!title) {
        setError("기록 제목을 입력해 주세요.");
        return;
      }
      await createRecordMutation.mutateAsync({
        body: {
          recordType: templateId,
          documentNumber,
          recordDate,
          recordTime,
          title,
          data: dataWithMeta,
          creationSource: "record_based",
        },
      });
      setMessage("기록이 저장되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    createRecordMutation,
    draftContent,
    selectedRow,
    templateId,
    visibleTemplateFields,
    summaryRecordTitle,
  ]);

  const reloadRows = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.records.mergedForSummary(50) });
  }, [queryClient]);

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[720px] flex-col text-left lg:max-w-none">
      <RecordDetailOverlay
        recordId={detailRecordId}
        onClose={() => setDetailRecordId(null)}
        onRecordChanged={reloadRows}
      />
      <h1 className="mb-5 text-[28px] font-bold leading-tight text-[#111827] sm:mb-6 sm:text-3xl">
        기록기반 생성
      </h1>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[3fr_7fr] lg:gap-8">
        <div className="mobile-app-card flex min-h-0 min-w-0 flex-col p-4 sm:p-5">
          <label className="mb-2 block text-sm font-medium text-gray-800">생성 템플릿</label>
          <select
            className={selectClass}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as VoiceRecordTemplateId)}
          >
            {templateOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">선택 기록을 바탕으로 위 템플릿의 새 기록을 생성합니다.</p>

          <p className="mt-5 text-sm font-medium text-gray-800">기준 기록 선택</p>
          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50/80">
            {listLoading ? (
              <p className="p-4 text-center text-sm text-gray-500">목록을 불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">
                최근 기록이 없습니다.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <button
                    key={`${row.id}-${row.clientRecordId}`}
                    type="button"
                    onClick={() => {
                      setSelectedRow(row);
                      setDraftContent(null);
                      setError("");
                      setMessage("");
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${selectedRow?.id === row.id ? "bg-blue-50" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-900">{row.documentNumber}</p>
                    <p className="text-xs text-gray-600">
                      {row.recordDateTime} · {row.title || row.recordType}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              type="button"
              disabled={!selectedRow || isGenerating || visibleTemplateFields.length === 0}
              onClick={handleGenerate}
              className="w-full rounded-lg bg-[#3B82F6] py-3 text-sm font-bold text-white hover:bg-[#2563EB] disabled:bg-gray-300"
            >
              {isGenerating ? "생성 중…" : "기록 기반 생성"}
            </button>
          </div>
        </div>

        <div className="mobile-app-card flex min-h-0 min-w-0 flex-col p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">생성 결과</h2>
          {!draftContent ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-16 text-center text-sm text-gray-500">
              왼쪽에서 기준 기록을 선택하고 생성 버튼을 누르면 결과가 표시됩니다.
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">기록 제목</span>
                <input
                  type="text"
                  value={summaryRecordTitle}
                  onChange={(e) => setSummaryRecordTitle(e.target.value)}
                  maxLength={512}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                />
              </label>
              {groupedTemplateFields.map(({ section, fields }) => (
                <section key={section} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4">
                  <h3 className="mb-3 text-xs font-semibold text-gray-700">{section}</h3>
                  <div className="space-y-3">
                    {fields.map((field) => {
                      const { field: fieldLabel } = splitTemplateLabel(field.label);
                      return (
                        <div key={field.storageKey}>
                          <label className="mb-1 block text-xs font-medium text-gray-600">{fieldLabel}</label>
                            <TemplateFieldControl
                            field={field}
                            templateId={templateId}
                            value={String(draftContent[field.storageKey] ?? "")}
                            onChange={(nextValue) =>
                              setDraftContent((prev) => (prev ? { ...prev, [field.storageKey]: nextValue } : prev))
                            }
                            classNameInputShort="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                            classNameTextarea="min-h-[56px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedRow || isSaving}
                className="sticky bottom-0 w-full rounded-lg bg-[#3B82F6] py-3 text-sm font-bold text-white hover:bg-[#2563EB] disabled:bg-gray-300"
              >
                {isSaving ? "저장 중…" : "간호기록 저장"}
              </button>
            </div>
          )}
        </div>
      </div>
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
