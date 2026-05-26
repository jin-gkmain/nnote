import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAuth } from "@/app/auth/auth-context";
import { ClinicalObservationForm } from "@/app/components/clinical-observation-form";
import { InputAssistField } from "@/app/components/input-assist-field";
import { TemplateFieldControl } from "@/app/components/template-field-control";
import { VoiceTranscriptBlocks } from "@/app/components/voice-transcript-blocks";
import {
  type RecordDetailResponse,
} from "@/app/data/nursingRecords";
import { splitTemplateLabel } from "@/app/data/template-field-registry";
import { queryKeys } from "@/app/query/query-keys";
import {
  useRecordDetailQuery,
  useMergedTemplateFieldsQuery,
  useUpdateRecordEmrStatusMutation,
  useUpdateRecordMutation,
} from "@/app/query/use-app-query";

export interface RecordDetailOverlayProps {
  readonly recordId: number | null;
  readonly onClose: () => void;
  readonly onRecordChanged?: () => void;
}

function creationSourceLabel(source: RecordDetailResponse["creationSource"]): string {
  if (source === "voice") return "음성 기록";
  if (source === "ocr") return "텍스트 OCR";
  if (source === "record_based") return "기록 기반 생성";
  if (source === "ai") return "AI 기록 생성";
  return "직접 작성";
}

function formatDetailDateTime(recordDate: string, recordTime: string): string {
  const t = recordTime?.slice(0, 5) ?? "";
  return `${recordDate} ${t}`.trim();
}

function deepCloneData(data: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

function isV2RecordData(data: Record<string, unknown>): boolean {
  return Number(data.schemaVersion ?? 0) === 2 && data.fields != null;
}

function extractEditableFields(data: Record<string, unknown>): Record<string, unknown> {
  if (!isV2RecordData(data)) return data;
  const fields = data.fields;
  return fields && typeof fields === "object" && !Array.isArray(fields)
    ? deepCloneData(fields as Record<string, unknown>)
    : {};
}

function withEditedFields(
  original: Record<string, unknown>,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  if (!isV2RecordData(original)) return fields;
  return { ...original, fields: { ...fields } };
}

/** 기반 내용을 보여줄 만한 데이터가 있을 때만 우측 패널 표시 */
function hasRecordSourceContent(detail: RecordDetailResponse): boolean {
  const d = detail.data;
  if (detail.creationSource === "manual") {
    return false;
  }
  if (detail.creationSource === "voice") {
    const transcript = typeof d["원문텍스트"] === "string" ? d["원문텍스트"].trim() : "";
    const attach = d["첨부파일정보"];
    const hasAttach =
      attach != null &&
      typeof attach === "object" &&
      !Array.isArray(attach) &&
      Object.keys(attach as object).length > 0;
    return transcript.length > 0 || hasAttach;
  }
  if (detail.creationSource === "ocr") {
    const text = typeof d["스캔원문"] === "string" ? d["스캔원문"].trim() : "";
    const savedAt = d["스캔저장시각"];
    return (
      text.length > 0 ||
      (typeof savedAt === "string" && savedAt.trim().length > 0)
    );
  }
  if (detail.creationSource === "record_based") {
    const sourceId = d["생성근거기록Id"];
    const sourceDoc = d["생성근거문서번호"];
    return sourceId != null || (typeof sourceDoc === "string" && sourceDoc.trim().length > 0);
  }
  if (detail.creationSource === "ai") {
    const memo = typeof d["메모원문"] === "string" ? d["메모원문"].trim() : "";
    const created = d["생성시각"];
    const aiType = d["AI프롬프트유형"];
    return (
      memo.length > 0 ||
      (typeof created === "string" && created.trim().length > 0) ||
      (typeof aiType === "string" && aiType.trim().length > 0)
    );
  }
  return false;
}

function RecordSourcePanel({ detail }: { detail: RecordDetailResponse }) {
  const d = detail.data;
  if (detail.creationSource === "voice") {
    const raw = d["원문텍스트"];
    const transcript = typeof raw === "string" ? raw : "";
    const attach = d["첨부파일정보"];
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-900">음성 원문</h3>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
          <VoiceTranscriptBlocks transcript={transcript} />
        </div>
        {attach != null && typeof attach === "object" ? (
          <div className="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600">
            <span className="font-medium text-gray-700">첨부·파일 정보</span>
            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(attach, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    );
  }
  if (detail.creationSource === "ocr") {
    const raw = d["스캔원문"];
    const text = typeof raw === "string" ? raw : "";
    const savedAt = d["스캔저장시각"];
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-900">OCR 스캔 원문</h3>
        {typeof savedAt === "string" && savedAt ? (
          <p className="text-xs text-gray-500">저장 시각: {savedAt}</p>
        ) : null}
        <textarea
          readOnly
          value={text}
          className="min-h-[200px] flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
        />
      </div>
    );
  }
  if (detail.creationSource === "ai") {
    const memo = d["메모원문"];
    const created = d["생성시각"];
    const aiType = d["AI프롬프트유형"];
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-900">AI 입력 원문</h3>
        {typeof aiType === "string" && aiType ? (
          <p className="text-xs text-gray-600">유형: {aiType}</p>
        ) : null}
        {typeof created === "string" && created ? (
          <p className="text-xs text-gray-500">생성 시각: {created}</p>
        ) : null}
        <textarea
          readOnly
          value={typeof memo === "string" ? memo : ""}
          className="min-h-[200px] flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
        />
      </div>
    );
  }
  if (detail.creationSource === "record_based") {
    const sourceId = d["생성근거기록Id"];
    const sourceDoc = d["생성근거문서번호"];
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-900">기록 기반 생성 정보</h3>
        <p className="text-sm text-gray-700">
          기준 기록 ID: {sourceId != null ? String(sourceId) : "-"}
        </p>
        <p className="text-sm text-gray-700">
          기준 문서번호: {typeof sourceDoc === "string" && sourceDoc ? sourceDoc : "-"}
        </p>
      </div>
    );
  }
  return null;
}

function SoapieFields({
  data,
  readOnly,
  onChange,
  templateId,
}: {
  data: Record<string, unknown>;
  readOnly: boolean;
  onChange?: (key: string, value: string) => void;
  templateId: string;
}) {
  const fields = [
    { key: "situation", label: "S (Subjective)" },
    { key: "objective", label: "O (Objective)" },
    { key: "assessment", label: "A (Assessment)" },
    { key: "plan", label: "P (Plan)" },
    { key: "intervention", label: "I (Intervention)" },
    { key: "evaluation", label: "E (Evaluation)" },
  ] as const;
  return (
    <div className="space-y-3">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
          <InputAssistField
            templateId={templateId}
            fieldKey={key}
            multiline
            rows={4}
            value={String(data[key] ?? "")}
            onChange={(nextValue) => onChange?.(key, nextValue)}
            readOnly={readOnly}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
          />
        </div>
      ))}
    </div>
  );
}

function SbarFields({
  data,
  readOnly,
  onChange,
  templateId,
}: {
  data: Record<string, unknown>;
  readOnly: boolean;
  onChange?: (key: string, value: string) => void;
  templateId: string;
}) {
  const fields = [
    { key: "작성자", label: "작성자" },
    { key: "situation", label: "S (Situation)" },
    { key: "background", label: "B (Background)" },
    { key: "assessment", label: "A (Assessment)" },
    { key: "recommendation", label: "R (Recommendation)" },
  ] as const;
  return (
    <div className="space-y-3">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
          <InputAssistField
            templateId={templateId}
            fieldKey={key}
            multiline
            rows={key === "작성자" ? 2 : 4}
            value={String(data[key] ?? "")}
            onChange={(nextValue) => onChange?.(key, nextValue)}
            readOnly={readOnly}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
          />
        </div>
      ))}
    </div>
  );
}

function ObservationBody({
  data,
  readOnly,
  editJson,
  onEditJson,
}: {
  data: Record<string, unknown>;
  readOnly: boolean;
  editJson: string;
  onEditJson: (v: string) => void;
}) {
  if (!readOnly) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="mb-2 text-xs text-amber-800">
          임상관찰기록지는 JSON으로 수정합니다. 저장 시 형식이 올바른지 확인해 주세요.
        </p>
        <textarea
          value={editJson}
          onChange={(e) => onEditJson(e.target.value)}
          className="min-h-[200px] flex-1 resize-none rounded-lg border border-gray-200 bg-white font-mono text-xs text-gray-900 sm:min-h-[280px] lg:min-h-[320px]"
        />
      </div>
    );
  }
  return (
    <pre className="max-h-full overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function RecordMainBody({
  detail,
  readOnly,
  editData,
  templateFields,
  onFieldChange,
  observationJson,
  onObservationJson,
  onClinicalObservationPatch,
}: {
  detail: RecordDetailResponse;
  readOnly: boolean;
  editData: Record<string, unknown>;
  templateFields: ReturnType<typeof useMergedTemplateFieldsQuery>["data"];
  onFieldChange: (key: string, value: string) => void;
  observationJson: string;
  onObservationJson: (v: string) => void;
  onClinicalObservationPatch: (path: string[], value: string) => void;
}) {
  if (isV2RecordData(detail.data)) {
    const fields = templateFields?.filter((field) => !field.hidden) ?? [];
    if (fields.length > 0) {
      return (
        <div className="space-y-5">
          {fields.map((field) => {
            const { section, field: fieldLabel } = field.label.includes(" · ")
              ? splitTemplateLabel(field.label)
              : { section: "", field: field.label };
            return (
              <div key={field.storageKey} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                {section ? (
                  <p className="mb-1 text-[11px] font-semibold text-gray-500">{section}</p>
                ) : null}
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  {fieldLabel}
                </label>
                <TemplateFieldControl
                  field={field}
                  templateId={detail.recordType}
                  patientId={detail.patientId}
                  readOnly={readOnly}
                  value={String(editData[field.storageKey] ?? "")}
                  onChange={(next) => onFieldChange(field.storageKey, next)}
                />
                {field.sourceDefinition ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
                    {field.sourceDefinition}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }
  }
  const rt = detail.recordType;
  if (rt === "간호기록지" || rt === "SOAP" || rt === "SOAPIE") {
    return (
      <SoapieFields
        data={editData}
        readOnly={readOnly}
        onChange={onFieldChange}
        templateId={detail.recordType}
      />
    );
  }
  if (rt === "간호인계기록지" || rt === "SBAR") {
    return (
      <SbarFields
        data={editData}
        readOnly={readOnly}
        onChange={onFieldChange}
        templateId={detail.recordType}
      />
    );
  }
  if (rt === "임상관찰기록지") {
    return (
      <ClinicalObservationForm
        data={editData}
        readOnly={readOnly}
        onChange={onClinicalObservationPatch}
      />
    );
  }
  return (
    <ObservationBody
      data={editData}
      readOnly={readOnly}
      editJson={observationJson}
      onEditJson={onObservationJson}
    />
  );
}

export function RecordDetailOverlay({
  recordId,
  onClose,
  onRecordChanged,
}: RecordDetailOverlayProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const recordDetailQuery = useRecordDetailQuery(recordId);
  const updateRecordMutation = useUpdateRecordMutation();
  const updateEmrStatusMutation = useUpdateRecordEmrStatusMutation(token);
  const [detail, setDetail] = useState<RecordDetailResponse | null>(null);
  const templateFieldsQuery = useMergedTemplateFieldsQuery(detail?.recordType ?? "");
  const [loadError, setLoadError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [observationJson, setObservationJson] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [recordTime, setRecordTime] = useState("");
  const [recordTitle, setRecordTitle] = useState("");
  const [saveError, setSaveError] = useState("");
  const isEmrSending = updateEmrStatusMutation.isPending;
  const isLoading = recordDetailQuery.isLoading || recordDetailQuery.isFetching;
  const canSendEmr = user?.role === "admin" || user?.verificationStatus === "verified";

  useEffect(() => {
    if (recordId == null) {
      setDetail(null);
      setLoadError("");
      return;
    }
    if (recordDetailQuery.error) {
      setDetail(null);
      setLoadError(recordDetailQuery.error instanceof Error ? recordDetailQuery.error.message : "불러오기 실패");
      return;
    }
    if (!recordDetailQuery.data) return;
    const d = recordDetailQuery.data;
    setLoadError("");
    setDetail(d);
    setEditData(extractEditableFields(d.data));
    setObservationJson(JSON.stringify(extractEditableFields(d.data), null, 2));
    setDocNumber(d.documentNumber);
    setRecordDate(d.recordDate);
    setRecordTime(d.recordTime.slice(0, 5));
    setRecordTitle(d.title ?? "");
    setIsEditing(false);
  }, [recordId, recordDetailQuery.data, recordDetailQuery.error]);

  const resetEditFromDetail = useCallback(() => {
    if (!detail) return;
    setEditData(extractEditableFields(detail.data));
    setObservationJson(JSON.stringify(extractEditableFields(detail.data), null, 2));
    setDocNumber(detail.documentNumber);
    setRecordDate(detail.recordDate);
    setRecordTime(detail.recordTime.slice(0, 5));
    setRecordTitle(detail.title ?? "");
  }, [detail]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patchClinicalObservationField = useCallback((path: string[], value: string) => {
    setEditData((prev) => {
      const next = deepCloneData(prev);
      let cur: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i]!;
        let nested = cur[segment];
        if (nested == null || typeof nested !== "object" || Array.isArray(nested)) {
          nested = {};
          cur[segment] = nested;
        }
        cur = nested as Record<string, unknown>;
      }
      cur[path[path.length - 1]!] = value;
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!detail) return;
    setSaveError("");
      try {
      let dataPayload = withEditedFields(detail.data, editData);
      const isStructuredForm =
        detail.recordType === "간호기록지" ||
        detail.recordType === "간호인계기록지" ||
        detail.recordType === "임상관찰기록지" ||
        detail.recordType === "SOAP" ||
        detail.recordType === "SOAPIE" ||
        detail.recordType === "SBAR";
      if (!isStructuredForm) {
        try {
        dataPayload = JSON.parse(observationJson) as Record<string, unknown>;
        } catch {
          setSaveError("JSON 형식이 올바르지 않습니다.");
          return;
        }
      }
      const titleTrim = recordTitle.trim().slice(0, 512);
      if (!titleTrim) {
        setSaveError("기록 제목을 입력해 주세요.");
        return;
      }
      await updateRecordMutation.mutateAsync({
        recordId: detail.id,
        body: {
          documentNumber: docNumber,
          recordDate,
          recordTime: recordTime.length === 5 ? `${recordTime}:00` : recordTime,
          title: titleTrim,
          data: dataPayload,
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(detail.id) });
      onRecordChanged?.();
      setIsEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 실패");
    }
  }, [
    detail,
    editData,
    observationJson,
    docNumber,
    recordDate,
    recordTime,
    recordTitle,
    updateRecordMutation,
    queryClient,
    onRecordChanged,
  ]);

  const handleEmrSend = useCallback(async () => {
    if (!detail || detail.emrSyncStatus === "sent") return;
    setSaveError("");
    try {
      await updateEmrStatusMutation.mutateAsync({ recordId: detail.id, status: "sent" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records.detail(detail.id) });
      onRecordChanged?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "EMR 전송 실패");
    }
  }, [detail, updateEmrStatusMutation, queryClient, onRecordChanged]);

  if (recordId == null) {
    return null;
  }

  const sentLocked = detail?.emrSyncStatus === "sent";
  const blocking = isLoading || updateRecordMutation.isPending || isEmrSending;
  const showSourcePanel = detail != null && hasRecordSourceContent(detail);
  const emrStatusBadgeClass =
    detail?.emrSyncStatus === "sent"
      ? "bg-emerald-100 text-emerald-900"
      : "bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200/80";
  const emrStatusLabel = detail?.emrSyncStatus === "sent" ? "전송완료" : "전송대기";

  return (
    <div
      className="fixed top-[var(--nursing-app-header-offset)] bottom-0 left-0 right-0 z-[260] flex flex-col bg-white lg:left-[100px]"
      role="dialog"
      aria-modal="true"
      aria-label="기록 상세"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* 앱 TODAY 헤더 아래: 뒤로 · 수정/EMR (배경 단색) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 sm:min-h-0 sm:min-w-0 sm:px-2"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            뒤로
          </button>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  disabled={sentLocked || blocking || !detail}
                  onClick={() => {
                    resetEditFromDetail();
                    setIsEditing(true);
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
                  수정
                </button>
                <button
                  type="button"
                  disabled={sentLocked || blocking || !detail || !canSendEmr}
                  onClick={() => void handleEmrSend()}
                  className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:min-h-0"
                >
                  {isEmrSending ? "전송 중…" : "EMR 전송"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={blocking}
                  onClick={() => {
                    resetEditFromDetail();
                    setIsEditing(false);
                    setSaveError("");
                  }}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 sm:min-h-0"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={blocking}
                  onClick={() => void handleSave()}
                  className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:min-h-0"
                >
                  {updateRecordMutation.isPending ? "저장 중…" : "저장"}
                </button>
              </>
            )}
          </div>
        </div>

        {loadError ? (
          <p className="px-4 py-3 text-sm text-red-600">{loadError}</p>
        ) : null}
        {saveError ? (
          <p className="px-4 py-2 text-sm text-red-600">{saveError}</p>
        ) : null}

        {isLoading && !detail ? (
          <p className="px-4 py-6 text-sm text-gray-600">기록을 불러오는 중…</p>
        ) : null}
        {detail && !loadError ? (
          <div
            className={`grid min-h-0 flex-1 grid-cols-1 gap-0 bg-white ${
              showSourcePanel ? "lg:grid-cols-10 lg:divide-x lg:divide-gray-200" : "lg:grid-cols-1"
            }`}
          >
            <div
              className={`min-h-0 overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)] [-webkit-overflow-scrolling:touch] ${showSourcePanel ? "lg:col-span-7" : "lg:col-span-1"}`}
            >
              <div className="p-4 sm:p-6">
                <div className="mb-6 border-b border-gray-100 pb-6">
                  <div className="flex flex-wrap items-center gap-2 gap-y-2">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                      {detail.title?.trim() ? detail.title : detail.documentNumber}
                    </h1>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${emrStatusBadgeClass}`}
                    >
                      {emrStatusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    #{detail.id} · {detail.documentNumber} · 분류: {detail.recordType}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {formatDetailDateTime(detail.recordDate, detail.recordTime)} ·{" "}
                    {creationSourceLabel(detail.creationSource)}
                  </p>
                  {isEditing ? (
                    <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
                        기록 제목
                        <input
                          value={recordTitle}
                          onChange={(e) => setRecordTitle(e.target.value)}
                          maxLength={512}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                        기록번호
                        <input
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                        날짜
                        <input
                          type="date"
                          value={recordDate}
                          onChange={(e) => setRecordDate(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                        시간
                        <input
                          type="time"
                          value={recordTime}
                          onChange={(e) => setRecordTime(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
                <h2 className="mb-4 text-base font-bold text-gray-900">생성 내용</h2>
                <RecordMainBody
                  detail={detail}
                  readOnly={!isEditing}
                  editData={editData}
                  templateFields={templateFieldsQuery.data}
                  onFieldChange={handleFieldChange}
                  observationJson={observationJson}
                  onObservationJson={setObservationJson}
                  onClinicalObservationPatch={patchClinicalObservationField}
                />
              </div>
            </div>
            {showSourcePanel ? (
              <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-gray-200 bg-white [-webkit-overflow-scrolling:touch] lg:col-span-3 lg:border-t-0 lg:border-l-0">
                <div className="flex h-full min-h-[200px] flex-col p-4 sm:p-6">
                  <h2 className="mb-4 text-base font-bold text-gray-900">원본 내용</h2>
                  <RecordSourcePanel detail={detail} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
