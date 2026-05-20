import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Patient } from "@/app/App";
import { useAuth } from "@/app/auth/auth-context";
import SelectPatientForVoiceModal from "@/app/components/SelectPatientForVoiceModal";
import { TemplateFieldControl } from "@/app/components/template-field-control";
import {
  buildHintContextText,
  buildStructuredHintsFromTemplate,
} from "@/app/data/ai-template-matcher";
import { buildRecordPayload } from "@/app/data/recordPayload";
import {
  buildDefaultRecordTitle,
  classificationLabelForTemplate,
} from "@/app/data/recordTitle";
import {
  toRecordDate,
  toRecordTime,
} from "@/app/data/nursingRecords";
import { type PatientDetailInfo } from "@/app/data/patientDetails";
import {
  VOICE_RECORD_TEMPLATES,
  type VoiceRecordTemplateId,
} from "@/app/data/voiceRecordTemplates";
import { buildAiTemplateFieldPayload, splitTemplateLabel } from "@/app/data/template-field-registry";
import {
  useAiDraftMutation,
  useCreateRecordMutation,
  useMergedTemplateFieldsQuery,
  usePatientDetailQuery,
  useTemplatesMapQuery,
  useUpdateRecordEmrStatusMutation,
} from "@/app/query/use-app-query";

interface AiRecordCreatePageProps {
  patients: Patient[];
  onPatientsRefresh: () => void;
}

const OK = {
  memoSource: "\uBA54\uBAA8\uC6D0\uBB38",
  createdAt: "\uC0DD\uC131\uC2DC\uAC01",
  aiTypeMeta: "template_fill",
} as const;

function buildPatientInfoLines(patient: Patient, detail: PatientDetailInfo | null): string[] {
  const lines = [
    `Name: ${patient.name}`,
    `PatientNo: ${patient.patientNumber}`,
    `Room: ${patient.roomNumber}`,
    `Gender: ${patient.gender}`,
    `DOB: ${patient.birthDate}`,
  ];
  if (detail) {
    if (detail.diagnosis) lines.push(`Diagnosis: ${detail.diagnosis}`);  
    if (detail.age != null && !Number.isNaN(detail.age)) lines.push(`Age: ${detail.age}`);
    if (detail.admissionDate) lines.push(`Admission: ${detail.admissionDate}`);
    if (detail.attendingDoctor) lines.push(`Attending: ${detail.attendingDoctor}`);
  }
  if (patient.diagnosis && !detail?.diagnosis) lines.push(`Diagnosis: ${patient.diagnosis}`);
  if (patient.attendingDoctor && !detail?.attendingDoctor) {
    lines.push(`Attending: ${patient.attendingDoctor}`);
  }
  return lines;
}

function buildAiPrompt(patient: Patient, detail: PatientDetailInfo | null, memo: string): string {
  const info = buildPatientInfoLines(patient, detail).join(", ");
  return `[Patient demographics]\n${info}\n\n[Nurse memo and clinical notes]\n${memo.trim()}`;
}

export default function AiRecordCreatePage({
  patients,
  onPatientsRefresh,
}: AiRecordCreatePageProps) {
  const { user, token } = useAuth();
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const patientDetailQuery = usePatientDetailQuery(selectedPatient?.id ?? "");
  const patientDetail: PatientDetailInfo | null = patientDetailQuery.data ?? null;
  const [selectedTemplate, setSelectedTemplate] = useState<VoiceRecordTemplateId>(
    VOICE_RECORD_TEMPLATES[0],
  );
  const [memo, setMemo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmr, setIsSendingEmr] = useState(false);
  const [error, setError] = useState("");

  const [draftContent, setDraftContent] = useState<Record<string, unknown> | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<VoiceRecordTemplateId | null>(null);
  const [generatedAtIso, setGeneratedAtIso] = useState<string | null>(null);
  const [memoSnapshot, setMemoSnapshot] = useState("");
  const [aiRecordTitle, setAiRecordTitle] = useState("");
  const aiCreateTitleSessionRef = useRef("");
  const aiDraftMutation = useAiDraftMutation<Record<string, unknown>>();
  const templatesMapQuery = useTemplatesMapQuery();
  const availableTemplates = Object.keys(templatesMapQuery.data ?? {});
  const templateOptions =
    templatesMapQuery.isSuccess && availableTemplates.length === 0
      ? []
      : availableTemplates.length > 0
        ? availableTemplates
        : [...VOICE_RECORD_TEMPLATES];
  const createRecordMutation = useCreateRecordMutation();
  const updateEmrMutation = useUpdateRecordEmrStatusMutation(token);
  const mergedTemplateFieldsQuery = useMergedTemplateFieldsQuery(selectedTemplate);
  const visibleTemplateFields = (mergedTemplateFieldsQuery.data ?? []).filter((f) => !f.hidden);
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
  const patientInfoText = selectedPatient
    ? buildPatientInfoLines(selectedPatient, patientDetail).join(", ")
    : "";

  const canSendEmr =
    user?.role === "admin" || user?.verificationStatus === "verified";

  useEffect(() => {
    if (!selectedPatient || !draftContent || !activeTemplate || !generatedAtIso) {
      setAiRecordTitle("");
      aiCreateTitleSessionRef.current = "";
      return;
    }
    const sessionKey = `${generatedAtIso}|${selectedPatient.id}|${activeTemplate}`;
    if (sessionKey === aiCreateTitleSessionRef.current) {
      return;
    }
    aiCreateTitleSessionRef.current = sessionKey;
    try {
      const contentForPayload = { ...draftContent };
      if (contentForPayload.date && typeof contentForPayload.date === "string") {
        contentForPayload.date = toRecordDate(contentForPayload.date as string);
      }
      if (contentForPayload.time && typeof contentForPayload.time === "string") {
        contentForPayload.time = toRecordTime(contentForPayload.time as string);
      }
      const { recordDate, recordTime } = buildRecordPayload(
        contentForPayload,
        activeTemplate,
        {
          allowUnknownFormType: true,
          templateFieldKeys: visibleTemplateFields.map((field) => field.storageKey),
        },
      );
      setAiRecordTitle(
        buildDefaultRecordTitle({
          patientName: selectedPatient.name,
          classificationLabel: classificationLabelForTemplate(
            activeTemplate,
            templatesMapQuery.data,
          ),
          recordDate,
          recordTime,
        }),
      );
    } catch {
      setAiRecordTitle("");
    }
  }, [
    selectedPatient,
    draftContent,
    activeTemplate,
    generatedAtIso,
    templatesMapQuery.data,
    visibleTemplateFields,
  ]);

  const resetOutput = useCallback(() => {
    setDraftContent(null);
    setActiveTemplate(null);
    setGeneratedAtIso(null);
    setMemoSnapshot("");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPatient) {
      setError("환자를 선택해 주세요.");
      return;
    }
    if (!memo.trim()) {
      setError("메모(특이사항)를 입력해 주세요.");
      return;
    }
    if (visibleTemplateFields.length === 0) {
      setError("템플릿 필드가 없습니다. 어드민에서 템플릿을 확인해 주세요.");
      return;
    }
    setError("");
    setIsGenerating(true);
    resetOutput();

    const prompt = `${buildAiPrompt(selectedPatient, patientDetail, memo)}

[Generation constraints]
- 환자 기본정보와 메모만 근거로 작성합니다.
- 기존 기록/외부 정보는 사용하지 않습니다.
- 근거 없는 값은 절대 임의 생성하지 말고 빈 문자열로 둡니다.
- 출력 키는 templateFields의 key만 사용합니다.
- 사실 추정/창작 금지.`;
    try {
      const templateFields = visibleTemplateFields.map((field) => buildAiTemplateFieldPayload(field));
      const structuredHints = buildStructuredHintsFromTemplate(visibleTemplateFields, prompt);
      const hintContext = buildHintContextText(structuredHints);
      const data = await aiDraftMutation.mutateAsync({
        text: hintContext ? `${prompt}\n\n${hintContext}` : prompt,
        type: "template_fill",
        templateFields: [...templateFields],
        structuredHints,
      });
      const generatedAt = new Date().toISOString();
      const draftValues: Record<string, unknown> = {};
      for (const field of visibleTemplateFields) {
        draftValues[field.storageKey] = String(data[field.storageKey] ?? "");
      }
      setDraftContent(draftValues);

      setActiveTemplate(selectedTemplate);
      setGeneratedAtIso(generatedAt);
      setMemoSnapshot(memo.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 기록 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedPatient,
    patientDetail,
    memo,
    selectedTemplate,
    resetOutput,
    aiDraftMutation,
    visibleTemplateFields,
  ]);

  const updateDraftField = useCallback((key: string, value: string) => {
    setDraftContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const createDraftRecord = useCallback(async (): Promise<number> => {
    if (!selectedPatient || !draftContent || !activeTemplate || !generatedAtIso) {
      throw new Error("EMR 전송할 생성 결과가 없습니다.");
    }
    const contentForPayload = { ...draftContent };
    if (contentForPayload.date && typeof contentForPayload.date === "string") {
      contentForPayload.date = toRecordDate(contentForPayload.date as string);
    }
    if (contentForPayload.time && typeof contentForPayload.time === "string") {
      contentForPayload.time = toRecordTime(contentForPayload.time as string);
    }
    const { documentNumber, recordDate, recordTime, data } = buildRecordPayload(
      contentForPayload,
      activeTemplate,
      {
        allowUnknownFormType: true,
        templateFieldKeys: (mergedTemplateFieldsQuery.data ?? [])
          .filter((field) => !field.hidden)
          .map((field) => field.storageKey),
      },
    );
    const dataWithMeta: Record<string, unknown> = {
      ...data,
      [OK.memoSource]: memoSnapshot,
      [OK.createdAt]: generatedAtIso,
      [OK.aiTypeMeta]: "template_fill",
      patientInfo: patientInfoText,
    };
    const title = aiRecordTitle.trim().slice(0, 512);
    if (!title) {
      throw new Error("기록 제목을 입력해 주세요.");
    }
    const created = await createRecordMutation.mutateAsync({
      patientId: selectedPatient.id,
      body: {
        recordType: activeTemplate,
        documentNumber,
        recordDate,
        recordTime,
        title,
        data: dataWithMeta,
        creationSource: "ai",
      },
    });
    return created.id;
  }, [
    selectedPatient,
    draftContent,
    activeTemplate,
    generatedAtIso,
    memoSnapshot,
    aiRecordTitle,
    createRecordMutation,
    mergedTemplateFieldsQuery.data,
    patientInfoText,
  ]);

  const clearAfterPersist = useCallback(() => {
    resetOutput();
    setMemo("");
    onPatientsRefresh();
  }, [onPatientsRefresh, resetOutput]);

  const handleSave = useCallback(async () => {
    if (!selectedPatient || !draftContent || !activeTemplate || !generatedAtIso) return;
    setIsSaving(true);
    setError("");
    try {
      await createDraftRecord();
      clearAfterPersist();
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedPatient,
    draftContent,
    activeTemplate,
    generatedAtIso,
    createDraftRecord,
    clearAfterPersist,
  ]);

  const handleSendEmr = useCallback(async () => {
    if (!selectedPatient || !draftContent || !activeTemplate || !generatedAtIso) return;
    setIsSendingEmr(true);
    setError("");
    try {
      const createdId = await createDraftRecord();
      await updateEmrMutation.mutateAsync({ recordId: createdId, status: "sent" });
      clearAfterPersist();
    } catch (e) {
      setError(e instanceof Error ? e.message : "EMR 전송에 실패했습니다.");
    } finally {
      setIsSendingEmr(false);
    }
  }, [
    selectedPatient,
    draftContent,
    activeTemplate,
    generatedAtIso,
    createDraftRecord,
    updateEmrMutation,
    clearAfterPersist,
  ]);

  const selectClass =
    "h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30";

  const blocking = isGenerating || isSaving || isSendingEmr;

  return (
    <div className="relative flex h-[calc(100dvh-7.5rem)] w-full flex-col overflow-hidden text-left">
      {blocking ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-gray-900 shadow-lg">
            {isSaving ? "저장하는 중…" : "AI가 초안을 생성하는 중…"}
          </p>
        </div>
      ) : null}

      <h1 className="mb-4 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">AI 기록 생성</h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2 lg:gap-8">
        <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <div>
              <span className="mb-2 block text-sm font-medium text-gray-800">
                환자 선택
                <span className="text-red-500" aria-hidden>
                  *
                </span>
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectModalOpen(true)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100"
                  aria-label="환자 선택"
                >
                  <Plus className="h-5 w-5" />
                </button>
                {selectedPatient ? (
                  <p className="min-w-0 text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">{selectedPatient.name}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    {selectedPatient.patientNumber}
                    <span className="mx-2 text-gray-400">|</span>
                    {selectedPatient.roomNumber}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">환자를 선택해 주세요.</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="ai-template-select"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                기록 서식 선택
              </label>
              <select
                id="ai-template-select"
                className={selectClass}
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as VoiceRecordTemplateId)}
              >
                {templateOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">어드민 템플릿 정의 기준으로 생성합니다.</p>
            </div>

            <div className="flex min-h-[200px] flex-1 flex-col">
              <label htmlFor="ai-memo" className="mb-2 block text-sm font-medium text-gray-800">
                메모 · 특이사항
                <span className="text-red-500" aria-hidden>
                  *
                </span>
              </label>
              <textarea
                id="ai-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="증상, 활력, 특이사항 등을 입력하세요. 왼쪽에서 선택한 환자 정보는 자동으로 전달됩니다."
                className="min-h-[160px] w-full flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 sm:min-h-[220px]"
              />
            </div>
          </div>

          <div className="mt-6 shrink-0 border-t border-gray-100 pt-5">
            <button
              type="button"
              disabled={
                !selectedPatient ||
                !memo.trim() ||
                visibleTemplateFields.length === 0 ||
                isGenerating
              }
              onClick={handleGenerate}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              생성하기
            </button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">생성 결과</h2>
            {draftContent && activeTemplate ? (
              <button
                type="button"
    disabled={!selectedPatient || isSaving || isSendingEmr || !canSendEmr}
                onClick={handleSendEmr}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSendingEmr ? "전송 중..." : "EMR전송"}
              </button>
            ) : null}
          </div>

          {selectedPatient ? (
            <div className="mb-4 rounded-lg border border-gray-100 bg-slate-50 px-4 py-3 text-sm text-gray-800">
              <p className="font-semibold text-gray-900">{selectedPatient.name}</p>
              <p className="mt-1 text-xs text-gray-600">
                {selectedPatient.patientNumber} · {selectedPatient.roomNumber} ·{" "}
                {selectedPatient.gender} · DOB {selectedPatient.birthDate}
              </p>
              {patientDetail?.diagnosis ? (
                <p className="mt-1 text-xs text-gray-600">Dx {patientDetail.diagnosis}</p>
              ) : selectedPatient.diagnosis ? (
                <p className="mt-1 text-xs text-gray-600">Dx {selectedPatient.diagnosis}</p>
              ) : null}
              {(patientDetail?.attendingDoctor || selectedPatient.attendingDoctor) && (
                <p className="mt-1 text-xs text-gray-600">
                  Attending{" "}
                  {patientDetail?.attendingDoctor ?? selectedPatient.attendingDoctor}
                </p>
              )}
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-500">환자를 선택하면 요약이 표시됩니다.</p>
          )}

          {!draftContent || !activeTemplate ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-16 text-center text-sm text-gray-500">
              왼쪽에서 입력한 뒤 &quot;생성하기&quot;를 누르면 AI 초안이 표시됩니다.
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">기록 제목</span>
                <input
                  type="text"
                  value={aiRecordTitle}
                  onChange={(e) => setAiRecordTitle(e.target.value)}
                  maxLength={512}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
                />
              </label>
              {groupedTemplateFields.map(({ section, fields }) => (
                <section
                  key={section}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4"
                >
                  <h3 className="mb-3 text-xs font-semibold text-gray-700">{section}</h3>
                  <div className="space-y-3">
                    {fields.map((field) => {
                      const { field: fieldLabel } = splitTemplateLabel(field.label);
                      return (
                        <div key={field.storageKey}>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            {fieldLabel}
                          </label>
                          <TemplateFieldControl
                            field={field}
                            templateId={activeTemplate}
                            patientId={selectedPatient ? Number(selectedPatient.id) : undefined}
                            value={String(draftContent[field.storageKey] ?? "")}
                            onChange={(nextValue) => updateDraftField(field.storageKey, nextValue)}
                            classNameInputShort="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                            classNameTextarea="min-h-[56px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              <button
                type="button"
                disabled={!selectedPatient || isSaving}
                onClick={handleSave}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSaving ? "저장 중…" : "간호기록 저장"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <SelectPatientForVoiceModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        patients={patients}
        onConfirm={(p) => {
          setSelectedPatient(p);
          resetOutput();
        }}
      />
    </div>
  );
}
