import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Upload, X } from "lucide-react";
import type { Patient } from "@/app/App";
import { useAuth } from "@/app/auth/auth-context";
import SelectPatientForVoiceModal from "@/app/components/SelectPatientForVoiceModal";
import SelectVoiceRecordTemplatesModal from "@/app/components/SelectVoiceRecordTemplatesModal";
import { buildRecordPayload } from "@/app/data/recordPayload";
import {
  buildDefaultRecordTitle,
  classificationLabelForTemplate,
} from "@/app/data/recordTitle";
import {
  VOICE_RECORD_TEMPLATES,
  type VoiceRecordTemplateId,
} from "@/app/data/voiceRecordTemplates";
import {
  buildAiTemplateFieldPayload,
  fetchTemplateUiConfigMap,
  mergeTemplateFieldOverrides,
  type TemplateFieldEffective,
} from "@/app/data/template-field-registry";
import { VoiceTranscriptBlocks } from "@/app/components/voice-transcript-blocks";
import type { SttMeta, SttResponse, SttSegment, SttSpeakerSummary } from "@/app/data/ai-api";
import { TemplateFieldControl } from "@/app/components/template-field-control";
import {
  buildHintContextText,
  buildStructuredHintsFromTemplate,
} from "@/app/data/ai-template-matcher";
import {
  useAiDraftMutation,
  useCreateRecordMutation,
  useSttMutation,
  useTemplatesMapQuery,
  useUpdateRecordEmrStatusMutation,
} from "@/app/query/use-app-query";
import { getPreferredSttEngine } from "@/app/data/stt-engine-preference";

interface VoiceRecordPageProps {
  patients: Patient[];
  onPatientsRefresh: () => void;
}

const TEMPLATE_FILL_CONCURRENCY = 2;

/** 템플릿별 `template_fill` 입력: 공통 digest + 원문(힌트는 원문 기반 규칙 유지) */
function buildCombinedTextForTemplateFill(
  digest: Record<string, unknown> | null,
  transcript: string,
): string {
  const digestBlock =
    digest && Object.keys(digest).length > 0
      ? `[공통 추출 정보]\n${JSON.stringify(digest, null, 2)}\n\n`
      : "";
  return `${digestBlock}[음성 STT 원문]\n${transcript}`;
}

async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const n = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: n }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

interface GeneratedNursingDraft {
  /** 생성 시점에 선택된 템플릿 순서 */
  sessionTemplateIds: VoiceRecordTemplateId[];
  draftsByTemplateId: Record<string, Record<string, string>>;
  fieldsByTemplateId: Record<string, TemplateFieldEffective[]>;
  sharedDigest: Record<string, unknown> | null;
  templateFillErrors?: Partial<Record<string, string>>;
  transcript: string;
  generatedAt: string;
  sttSegments: SttSegment[];
  sttSpeakers: SttSpeakerSummary[];
  sttMeta: SttMeta | null;
}

/** 생성 완료 후 파일첨부 자리에 표시하는 메타 */
interface GenerationMeta {
  fileName: string;
  createdAtIso: string;
  sourceType: "file" | "recording";
  /** 녹음 완료 시에만 초 단위 길이, 파일 업로드 시 null */
  durationSec: number | null;
}

interface RecordingHistoryItem {
  id: string;
  sourceType: "file" | "recording";
  fileName: string;
  createdAt: string;
  durationSec?: number;
  status: "success" | "failed";
  message?: string;
  /** STT로 변환된 원문 (성공 시, 또는 STT 이후 단계에서만 실패한 경우) */
  transcript?: string;
  sttSegments?: SttSegment[];
}

type RecordingState = "idle" | "recording" | "paused";

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** UI용: "3분 24초", "45초" 형태 */
function formatDurationHumanKo(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  if (s === 0) return `${m}분`;
  return `${m}분 ${s}초`;
}

/** 표시용 파일명(확장자 제거) */
function stripFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0 || i >= fileName.length - 1) return fileName;
  return fileName.slice(0, i);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function VoiceRecordPage({
  patients,
  onPatientsRefresh,
}: VoiceRecordPageProps) {
  const { user, token } = useAuth();
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<VoiceRecordTemplateId[]>(
    [],
  );
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedNursingDraft | null>(
    null,
  );
  const [generationMeta, setGenerationMeta] = useState<GenerationMeta | null>(null);
  const [history, setHistory] = useState<RecordingHistoryItem[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSec, setRecordingSec] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  /** 오버레이 문구·진행 막대 구간용 */
  const [generationPhase, setGenerationPhase] = useState<
    "stt" | "digest" | "template_fill"
  >("stt");
  const [templateFillProgress, setTemplateFillProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmr, setIsSendingEmr] = useState(false);
  const [error, setError] = useState("");
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState(0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [activeDraftTemplateId, setActiveDraftTemplateId] =
    useState<VoiceRecordTemplateId | null>(null);
  const templatesMapQuery = useTemplatesMapQuery();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shouldGenerateOnStopRef = useRef(false);
  const completedDurationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationPhaseRef = useRef(generationPhase);
  generationPhaseRef.current = generationPhase;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** 오버레이 진행 막대: 실제 백분율 없이 천천히 차오르는 표시 */
  const [loadingFillPercent, setLoadingFillPercent] = useState(0);
  /** 템플릿별 기록 제목(기본값 자동 채움, 수정 가능) */
  const [recordTitlesByTemplateId, setRecordTitlesByTemplateId] = useState<
    Record<string, string>
  >({});
  const sttMutation = useSttMutation();
  const aiDraftMutation = useAiDraftMutation<Record<string, unknown>>();
  const createRecordMutation = useCreateRecordMutation();
  const updateEmrMutation = useUpdateRecordEmrStatusMutation(token);
  const availableTemplates = useMemo((): string[] => {
    const fromServer = Object.keys(templatesMapQuery.data ?? {});
    if (templatesMapQuery.isSuccess && fromServer.length === 0) return [];
    return fromServer.length > 0 ? fromServer : [...VOICE_RECORD_TEMPLATES];
  }, [templatesMapQuery.data, templatesMapQuery.isSuccess]);

  const voiceTitleSessionByTemplateRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!availableTemplates.length) return;
    setSelectedTemplates((prev) => {
      const filtered = prev.filter((id) =>
        availableTemplates.includes(id),
      ) as VoiceRecordTemplateId[];
      if (
        filtered.length === prev.length &&
        filtered.every((t, i) => t === prev[i])
      ) {
        return prev;
      }
      return filtered;
    });
  }, [availableTemplates]);

  const canStartVoiceCapture =
    Boolean(selectedPatient) && selectedTemplates.length > 0;

  const templateSelectionLocked =
    !!generatedDraft || isGenerating || recordingState !== "idle";

  const activeDraftTemplateIdResolved = useMemo(() => {
    const ids = generatedDraft?.sessionTemplateIds;
    if (!ids?.length) return null;
    if (activeDraftTemplateId && ids.includes(activeDraftTemplateId)) {
      return activeDraftTemplateId;
    }
    return ids[0] ?? null;
  }, [generatedDraft, activeDraftTemplateId]);

  useEffect(() => {
    if (!selectedPatient || !generatedDraft) {
      setRecordTitlesByTemplateId({});
      voiceTitleSessionByTemplateRef.current = {};
      return;
    }
    const genKey = `${generatedDraft.generatedAt}|${selectedPatient.id}`;
    const updates: Record<string, string> = {};
    for (const tid of generatedDraft.sessionTemplateIds) {
      const sessionKey = `${genKey}|${tid}`;
      if (voiceTitleSessionByTemplateRef.current[tid] === sessionKey) {
        continue;
      }
      voiceTitleSessionByTemplateRef.current[tid] = sessionKey;
      const fields = generatedDraft.fieldsByTemplateId[tid] ?? [];
      const values = generatedDraft.draftsByTemplateId[tid] ?? {};
      try {
        const { recordDate, recordTime } = buildRecordPayload(
          { ...values },
          tid,
          {
            allowUnknownFormType: true,
            templateFieldKeys: fields.map((field) => field.storageKey),
          },
        );
        const label = classificationLabelForTemplate(tid, templatesMapQuery.data);
        updates[tid] = buildDefaultRecordTitle({
          patientName: selectedPatient.name,
          classificationLabel: label,
          recordDate,
          recordTime,
        });
      } catch {
        updates[tid] = "";
      }
    }
    if (Object.keys(updates).length > 0) {
      setRecordTitlesByTemplateId((prev) => ({ ...prev, ...updates }));
    }
  }, [selectedPatient, generatedDraft, templatesMapQuery.data]);

  const canSendEmr = user?.role === "admin" || user?.verificationStatus === "verified";

  const buildAttachmentMeta = (file: File) => ({
    이름: file.name,
    생성일시: new Date(file.lastModified).toISOString(),
    크기바이트: file.size,
    MIME타입: file.type || "unknown",
  });

  const pushHistory = useCallback((item: Omit<RecordingHistoryItem, "id">) => {
    setHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        ...item,
      },
      ...prev,
    ]);
  }, []);

  const generateDraftFromAudio = useCallback(
    async (
      file: File,
      sourceType: "file" | "recording",
      durationSec?: number,
    ) => {
      const templatesForSession = selectedTemplates.filter((id) =>
        availableTemplates.includes(id),
      ) as VoiceRecordTemplateId[];
      if (templatesForSession.length === 0) {
        setError("템플릿을 하나 이상 선택해 주세요.");
        return;
      }

      setIsGenerating(true);
      setGenerationPhase("stt");
      setTemplateFillProgress(null);
      setError("");
      setAttachedFile(file);
      setGeneratedDraft(null);
      setGenerationMeta(null);
      setActiveDraftTemplateId(null);

      let sttResultAfterStt: SttResponse | undefined;

      try {
        const sttResult = await sttMutation.mutateAsync({
          audio: file,
          engine: getPreferredSttEngine(),
        });
        sttResultAfterStt = sttResult;
        const transcript = sttResult.text;
        if (audioPlaybackUrl) {
          URL.revokeObjectURL(audioPlaybackUrl);
        }
        setAudioPlaybackUrl(URL.createObjectURL(file));
        setCurrentPlaybackSec(0);
        setActiveSegmentId(null);

        setGenerationPhase("digest");
        const digestRaw = await aiDraftMutation.mutateAsync({
          text: transcript,
          type: "transcript_digest",
        });
        const sharedDigest =
          digestRaw &&
          typeof digestRaw === "object" &&
          !Array.isArray(digestRaw) &&
          digestRaw !== null
            ? (digestRaw as Record<string, unknown>)
            : null;

        const combinedBase = buildCombinedTextForTemplateFill(sharedDigest, transcript);
        const uiMap = await fetchTemplateUiConfigMap();

        setGenerationPhase("template_fill");
        setTemplateFillProgress({ current: 0, total: templatesForSession.length });

        const draftsByTemplateId: Record<string, Record<string, string>> = {};
        const fieldsByTemplateId: Record<string, TemplateFieldEffective[]> = {};
        const templateFillErrors: Partial<Record<string, string>> = {};
        let fillDone = 0;

        await runWithConcurrencyLimit(
          templatesForSession,
          TEMPLATE_FILL_CONCURRENCY,
          async (tid) => {
            const merged = mergeTemplateFieldOverrides(
              tid,
              uiMap[tid]?.sections ?? null,
            ).filter((f) => !f.hidden);
            fieldsByTemplateId[tid] = merged;
            const templateFields = merged.map((field) => buildAiTemplateFieldPayload(field));
            const structuredHints = buildStructuredHintsFromTemplate(merged, transcript);
            const hintContext = buildHintContextText(structuredHints);
            const textForFill = hintContext
              ? `${combinedBase}\n\n${hintContext}`
              : combinedBase;
            try {
              const draft = await aiDraftMutation.mutateAsync({
                text: textForFill,
                type: "template_fill",
                templateFields,
                structuredHints,
              });
              const templateValues: Record<string, string> = {};
              for (const field of merged) {
                templateValues[field.storageKey] = String(
                  draft[field.storageKey] ?? "",
                );
              }
              draftsByTemplateId[tid] = templateValues;
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "템플릿 초안 생성에 실패했습니다.";
              templateFillErrors[tid] = msg;
              draftsByTemplateId[tid] = Object.fromEntries(
                merged.map((f) => [f.storageKey, ""]),
              );
            }
            fillDone += 1;
            setTemplateFillProgress({
              current: fillDone,
              total: templatesForSession.length,
            });
          },
        );

        const generatedAt = new Date().toISOString();
        setGeneratedDraft({
          sessionTemplateIds: templatesForSession,
          draftsByTemplateId,
          fieldsByTemplateId,
          sharedDigest,
          templateFillErrors:
            Object.keys(templateFillErrors).length > 0 ? templateFillErrors : undefined,
          transcript,
          generatedAt,
          sttSegments: sttResult.segments,
          sttSpeakers: sttResult.speakers,
          sttMeta: sttResult.meta,
        });
        setActiveDraftTemplateId(templatesForSession[0] ?? null);
        setGenerationMeta({
          fileName: file.name,
          createdAtIso: generatedAt,
          sourceType,
          durationSec:
            sourceType === "recording" && typeof durationSec === "number"
              ? durationSec
              : null,
        });

        pushHistory({
          sourceType,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          durationSec,
          status: "success",
          transcript,
          sttSegments: sttResult.segments,
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "간호기록지 생성 중 오류가 발생했습니다.";
        setError(message);
        setAttachedFile(null);
        setGeneratedDraft(null);
        setGenerationMeta(null);
        setActiveDraftTemplateId(null);
        pushHistory({
          sourceType,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          durationSec,
          status: "failed",
          message,
          transcript: sttResultAfterStt?.text,
          sttSegments: sttResultAfterStt?.segments,
        });
      } finally {
        setTemplateFillProgress(null);
        setIsGenerating(false);
      }
    },
    [
      aiDraftMutation,
      audioPlaybackUrl,
      availableTemplates,
      pushHistory,
      selectedTemplates,
      sttMutation,
    ],
  );

  useEffect(() => {
    if (recordingState !== "recording") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setRecordingSec((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioPlaybackUrl) {
        URL.revokeObjectURL(audioPlaybackUrl);
      }
    };
  }, [audioPlaybackUrl]);

  const startNewRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldGenerate = shouldGenerateOnStopRef.current;
        shouldGenerateOnStopRef.current = false;
        const duration = completedDurationRef.current;
        completedDurationRef.current = 0;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setRecordingState("idle");
        setRecordingSec(0);

        if (!shouldGenerate) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `recording-${timestamp}.webm`, {
          type: blob.type || "audio/webm",
          lastModified: Date.now(),
        });
        await generateDraftFromAudio(file, "recording", duration);
      };

      recorder.start();
      setRecordingSec(0);
      setRecordingState("recording");
    } catch {
      setError(
        "마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해 주세요.",
      );
    }
  }, [generateDraftFromAudio]);

  const toggleRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      await startNewRecording();
      return;
    }

    if (recordingState === "recording" && recorder.state === "recording") {
      recorder.pause();
      setRecordingState("paused");
      return;
    }

    if (recordingState === "paused" && recorder.state === "paused") {
      recorder.resume();
      setRecordingState("recording");
    }
  }, [recordingState, startNewRecording]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    shouldGenerateOnStopRef.current = false;
    completedDurationRef.current = 0;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      setRecordingState("idle");
      setRecordingSec(0);
      chunksRef.current = [];
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
    }
  }, []);

  const completeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    shouldGenerateOnStopRef.current = true;
    completedDurationRef.current = recordingSec;
    recorder.stop();
  }, [recordingSec]);

  const saveGeneratedRecordByTemplateId = useCallback(
    async (templateId: VoiceRecordTemplateId): Promise<number> => {
      if (!selectedPatient || !generatedDraft) {
        throw new Error("저장할 초안이 없습니다.");
      }
      const values = generatedDraft.draftsByTemplateId[templateId];
      const fields = generatedDraft.fieldsByTemplateId[templateId] ?? [];
      if (!values) {
        throw new Error(`「${templateId}」템플릿 데이터가 없습니다.`);
      }
      const { documentNumber, recordDate, recordTime, data } = buildRecordPayload(
        { ...values },
        templateId,
        {
          allowUnknownFormType: true,
          templateFieldKeys: fields.map((field) => field.storageKey),
        },
      );
      const dataWithMeta = {
        ...data,
        원문텍스트: generatedDraft.transcript,
        생성시각: generatedDraft.generatedAt,
        ...(generatedDraft.sharedDigest
          ? { 공통추출정보: generatedDraft.sharedDigest }
          : {}),
        sttMeta: generatedDraft.sttMeta,
        sttSegments: generatedDraft.sttSegments,
        speakerSummary: generatedDraft.sttSpeakers,
        ...(attachedFile
          ? { 첨부파일정보: buildAttachmentMeta(attachedFile) }
          : {}),
      };
      const title = (recordTitlesByTemplateId[templateId] ?? "").trim().slice(0, 512);
      if (!title) {
        throw new Error(`「${templateId}」기록 제목을 입력해 주세요.`);
      }
      const created = await createRecordMutation.mutateAsync({
        patientId: selectedPatient.id,
        body: {
          recordType: templateId,
          documentNumber,
          recordDate,
          recordTime,
          title,
          data: dataWithMeta,
          creationSource: "voice",
        },
      });
      return created.id;
    },
    [
      selectedPatient,
      generatedDraft,
      attachedFile,
      recordTitlesByTemplateId,
      createRecordMutation,
    ],
  );

  const saveAllGeneratedRecords = useCallback(async (): Promise<number[]> => {
    if (!selectedPatient || !generatedDraft) {
      throw new Error("저장할 초안이 없습니다.");
    }
    const createdIds: number[] = [];
    for (const tid of generatedDraft.sessionTemplateIds) {
      const createdId = await saveGeneratedRecordByTemplateId(tid);
      createdIds.push(createdId);
    }
    return createdIds;
  }, [selectedPatient, generatedDraft, saveGeneratedRecordByTemplateId]);

  const clearGeneratedOutput = useCallback(() => {
    setGeneratedDraft(null);
    setGenerationMeta(null);
    setAttachedFile(null);
    setHistory([]);
    setActiveDraftTemplateId(null);
    setRecordTitlesByTemplateId({});
    voiceTitleSessionByTemplateRef.current = {};
    if (audioPlaybackUrl) {
      URL.revokeObjectURL(audioPlaybackUrl);
    }
    setAudioPlaybackUrl(null);
    setCurrentPlaybackSec(0);
    setActiveSegmentId(null);
    onPatientsRefresh();
  }, [audioPlaybackUrl, onPatientsRefresh]);

  const handleSaveSingleGeneratedRecord = useCallback(async () => {
    if (!selectedPatient || !generatedDraft || !activeDraftTemplateIdResolved) return;
    setIsSaving(true);
    setError("");
    try {
      const savedTemplateId = activeDraftTemplateIdResolved;
      await saveGeneratedRecordByTemplateId(savedTemplateId);
      setGeneratedDraft((prev) => {
        if (!prev) return prev;
        const nextTemplateIds = prev.sessionTemplateIds.filter(
          (templateId) => templateId !== savedTemplateId,
        );
        if (nextTemplateIds.length === 0) {
          return null;
        }
        const { [savedTemplateId]: _removedDraft, ...nextDraftsByTemplateId } =
          prev.draftsByTemplateId;
        const { [savedTemplateId]: _removedFields, ...nextFieldsByTemplateId } =
          prev.fieldsByTemplateId;
        const nextTemplateFillErrors = prev.templateFillErrors
          ? (() => {
              const { [savedTemplateId]: _removedError, ...rest } =
                prev.templateFillErrors;
              return Object.keys(rest).length > 0 ? rest : undefined;
            })()
          : undefined;
        return {
          ...prev,
          sessionTemplateIds: nextTemplateIds,
          draftsByTemplateId: nextDraftsByTemplateId,
          fieldsByTemplateId: nextFieldsByTemplateId,
          templateFillErrors: nextTemplateFillErrors,
        };
      });
      setRecordTitlesByTemplateId((prev) => {
        const { [savedTemplateId]: _removedTitle, ...rest } = prev;
        return rest;
      });
      setActiveDraftTemplateId((prev) =>
        prev === savedTemplateId ? null : prev,
      );
      onPatientsRefresh();
      if (generatedDraft.sessionTemplateIds.length === 1) {
        clearGeneratedOutput();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedPatient,
    generatedDraft,
    activeDraftTemplateIdResolved,
    saveGeneratedRecordByTemplateId,
    onPatientsRefresh,
    clearGeneratedOutput,
  ]);

  const handleSaveAllGeneratedRecords = useCallback(async () => {
    if (!selectedPatient || !generatedDraft) return;
    setIsSaving(true);
    setError("");
    try {
      await saveAllGeneratedRecords();
      clearGeneratedOutput();
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [selectedPatient, generatedDraft, saveAllGeneratedRecords, clearGeneratedOutput]);

  const handleSendEmrGeneratedRecord = useCallback(async () => {
    if (!selectedPatient || !generatedDraft) return;
    setIsSendingEmr(true);
    setError("");
    try {
      const createdIds = await saveAllGeneratedRecords();
      for (const recordId of createdIds) {
        await updateEmrMutation.mutateAsync({ recordId, status: "sent" });
      }
      clearGeneratedOutput();
    } catch (e) {
      setError(e instanceof Error ? e.message : "EMR 전송에 실패했습니다.");
    } finally {
      setIsSendingEmr(false);
    }
  }, [selectedPatient, generatedDraft, saveAllGeneratedRecords, clearGeneratedOutput, updateEmrMutation]);

  const resetGeneratedSession = useCallback(() => {
    setGeneratedDraft(null);
    setGenerationMeta(null);
    setAttachedFile(null);
    setHistory([]);
    setError("");
    setActiveDraftTemplateId(null);
    setRecordTitlesByTemplateId({});
    voiceTitleSessionByTemplateRef.current = {};
    if (audioPlaybackUrl) {
      URL.revokeObjectURL(audioPlaybackUrl);
    }
    setAudioPlaybackUrl(null);
    setCurrentPlaybackSec(0);
    setActiveSegmentId(null);
  }, [audioPlaybackUrl]);

  const blockingOverlay = isGenerating || isSaving || isSendingEmr;

  useEffect(() => {
    if (!generatedDraft || generatedDraft.sttSegments.length === 0) {
      setActiveSegmentId(null);
      return;
    }
    const active = generatedDraft.sttSegments.find(
      (segment) => currentPlaybackSec >= segment.startSec && currentPlaybackSec <= segment.endSec,
    );
    setActiveSegmentId(active?.id ?? null);
  }, [currentPlaybackSec, generatedDraft]);

  useEffect(() => {
    if (!blockingOverlay) {
      setLoadingFillPercent(0);
      return;
    }
    setLoadingFillPercent(2);
    const id = window.setInterval(() => {
      setLoadingFillPercent((p) => {
        const cap = isSavingRef.current
          ? 93
          : generationPhaseRef.current === "stt"
            ? 48
            : generationPhaseRef.current === "digest"
              ? 62
              : 88;
        if (p >= cap) return p;
        return Math.min(cap, p + Math.max(0.2, (cap - p) * 0.038));
      });
    }, 110);
    return () => clearInterval(id);
  }, [blockingOverlay]);

  return (
    <div className="relative flex min-h-full w-full flex-col text-left">
      {blockingOverlay ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[200] flex items-end justify-center pb-[14vh] sm:pb-[18vh]"
          role="dialog"
          aria-busy="true"
          aria-live="polite"
          aria-label={isSaving ? "저장 중" : "음성 처리 중"}
        >
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px]"
            aria-hidden
          />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-xl">
            <p className="text-center text-sm font-medium text-gray-900">
              {isSaving
                ? "간호기록지를 저장하는 중입니다..."
                : generationPhase === "stt"
                  ? "음성을 텍스트로 변환하는 중입니다..."
                  : generationPhase === "digest"
                    ? "음성에서 공통 임상 정보를 추출하는 중입니다..."
                    : templateFillProgress
                      ? `선택한 템플릿별 초안 생성 중 (${templateFillProgress.current}/${templateFillProgress.total})...`
                      : "간호기록지 초안을 생성하는 중입니다..."}
            </p>
            <div className="nursing-voice-loading-bar-track mt-4">
              <div
                className="nursing-voice-loading-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, loadingFillPercent))}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">
              {isSaving ? "잠시만 기다려 주세요." : "창을 닫지 마세요."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex w-full max-w-none flex-1 flex-col pl-1 pt-2 sm:pl-2">
        <h1 className="mb-5 text-xl font-bold text-gray-900 sm:mb-8 sm:text-2xl">음성기록</h1>

        <div className="grid w-full grid-cols-1 items-center gap-y-4 sm:grid-cols-[auto_1fr] sm:gap-x-[100px] sm:gap-y-6">
          <span className="shrink-0 text-sm font-medium text-gray-800">
            환자선택
            <span className="text-red-500" aria-hidden>
              *
            </span>
          </span>
          <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectModalOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-gray-800 transition-colors hover:bg-gray-100"
              aria-label="환자 선택 열기"
            >
              <Plus className="h-5 w-5" />
            </button>
            {selectedPatient ? (
              <p className="min-w-0 text-sm text-gray-800">
                <span className="font-semibold text-gray-900">
                  {selectedPatient.name}
                </span>
                <span className="mx-2 text-gray-400">|</span>
                등록 {selectedPatient.patientNumber}
                <span className="mx-2 text-gray-400">|</span>
                {selectedPatient.roomNumber}
              </p>
            ) : null}
          </div>

          <span className="shrink-0 text-sm font-medium text-gray-800">
            기록지 선택
            <span className="ml-1 text-xs font-normal text-gray-500">(최대 3개)</span>
          </span>
          <div
            className="flex min-h-9 min-w-0 flex-wrap items-center gap-2 sm:flex-1 sm:max-w-xl"
            role="group"
            aria-label="간호기록 기록지 선택"
          >
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              disabled={templateSelectionLocked}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="기록지 추가"
            >
              <Plus className="h-5 w-5" />
            </button>
            {selectedTemplates.map((tid) => (
              <span
                key={tid}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm text-gray-900"
              >
                <span className="min-w-0 truncate" title={tid}>
                  {tid}
                </span>
                <button
                  type="button"
                  disabled={templateSelectionLocked}
                  onClick={() =>
                    setSelectedTemplates((prev) => prev.filter((t) => t !== tid))
                  }
                  className="inline-flex shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`${tid} 제거`}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="my-6 w-full border-t border-gray-200" role="separator" />

        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept="audio/*,.wav,.webm,.mp3,.m4a,.ogg"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!selectedPatient) {
              setError("먼저 환자를 선택해 주세요.");
              return;
            }
            if (selectedTemplates.length === 0) {
              setError("템플릿을 하나 이상 선택해 주세요.");
              return;
            }
            await generateDraftFromAudio(file, "file");
          }}
        />

        <div className="mb-6 grid w-full flex-1 gap-4 lg:grid-cols-4 lg:items-start">
          <div className="min-w-0 space-y-4 lg:col-span-3">
            {!generatedDraft ? (
              <div className="flex w-full justify-start">
                {!isGenerating ? (
                  <button
                    type="button"
                    disabled={!canStartVoiceCapture || isGenerating}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-[40px] min-w-[80px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <Upload className="h-4 w-4 shrink-0" strokeWidth={2} />
                    파일 첨부
                  </button>
                ) : null}
              </div>
            ) : null}

            {generatedDraft && generationMeta ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p
                  className="truncate text-xl font-bold tracking-tight text-gray-900"
                  title={generationMeta.fileName}
                >
                  {stripFileExtension(generationMeta.fileName)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDateTime(generationMeta.createdAtIso)}
                </p>
                {generatedDraft.sessionTemplateIds.length > 1 ? (
                  <div
                    className="mb-3 mt-4 flex items-center justify-center gap-2 sm:gap-4"
                    role="navigation"
                    aria-label="기록지 슬라이드"
                  >
                    <button
                      type="button"
                      aria-label="이전 기록지"
                      disabled={
                        !activeDraftTemplateIdResolved ||
                        generatedDraft.sessionTemplateIds.indexOf(
                          activeDraftTemplateIdResolved,
                        ) <= 0
                      }
                      onClick={() => {
                        const ids = generatedDraft.sessionTemplateIds;
                        const i = activeDraftTemplateIdResolved
                          ? ids.indexOf(activeDraftTemplateIdResolved)
                          : 0;
                        if (i > 0) setActiveDraftTemplateId(ids[i - 1]!);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {generatedDraft.sessionTemplateIds.map((tid, i) => {
                        const err = generatedDraft.templateFillErrors?.[tid];
                        const isCurrent =
                          tid === activeDraftTemplateIdResolved;
                        return (
                          <button
                            key={tid}
                            type="button"
                            aria-label={`${i + 1}번째 기록지${err ? `, 오류: ${err}` : ""}`}
                            aria-current={isCurrent ? "true" : undefined}
                            title={err ?? undefined}
                            onClick={() => setActiveDraftTemplateId(tid)}
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              isCurrent
                                ? "bg-blue-600 ring-2 ring-blue-200"
                                : err
                                  ? "bg-red-300 ring-1 ring-red-200"
                                  : "bg-gray-300 hover:bg-gray-400"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      aria-label="다음 기록지"
                      disabled={
                        !activeDraftTemplateIdResolved ||
                        generatedDraft.sessionTemplateIds.indexOf(
                          activeDraftTemplateIdResolved,
                        ) >=
                          generatedDraft.sessionTemplateIds.length - 1
                      }
                      onClick={() => {
                        const ids = generatedDraft.sessionTemplateIds;
                        const i = activeDraftTemplateIdResolved
                          ? ids.indexOf(activeDraftTemplateIdResolved)
                          : 0;
                        if (i < ids.length - 1) setActiveDraftTemplateId(ids[i + 1]!);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>
                ) : null}
                {activeDraftTemplateIdResolved ? (
                  <>
                    <p
                      className="mb-3 truncate text-lg font-semibold tracking-tight text-gray-900"
                      title={
                        recordTitlesByTemplateId[activeDraftTemplateIdResolved] ??
                        activeDraftTemplateIdResolved
                      }
                    >
                      {recordTitlesByTemplateId[activeDraftTemplateIdResolved] ??
                        activeDraftTemplateIdResolved}
                    </p>
                    {generatedDraft.templateFillErrors?.[
                      activeDraftTemplateIdResolved
                    ] ? (
                      <p className="mb-3 text-xs text-red-600">
                        이 기록지 초안 생성 오류:{" "}
                        {
                          generatedDraft.templateFillErrors[
                            activeDraftTemplateIdResolved
                          ]
                        }
                      </p>
                    ) : null}
                  </>
                ) : null}
                {activeDraftTemplateIdResolved ? (
                  <label className="mb-4 block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      기록 제목
                    </span>
                    <input
                      type="text"
                      value={
                        recordTitlesByTemplateId[activeDraftTemplateIdResolved] ?? ""
                      }
                      onChange={(e) =>
                        setRecordTitlesByTemplateId((prev) => ({
                          ...prev,
                          [activeDraftTemplateIdResolved]: e.target.value,
                        }))
                      }
                      maxLength={512}
                      className="h-10 w-full max-w-2xl rounded-lg border border-gray-200 px-3 text-sm text-gray-900"
                      placeholder="환자명-분류-일시 형식으로 기본 채움"
                    />
                  </label>
                ) : null}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900">AI 초안</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetGeneratedSession}
                      className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:min-h-0"
                    >
                      다시 작성
                    </button>
                    <button
                      type="button"
  disabled={!selectedPatient || isSaving || isSendingEmr || !canSendEmr}
                      onClick={handleSendEmrGeneratedRecord}
                      className="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:min-h-0"
                    >
                      {isSendingEmr ? "전송 중..." : "EMR전송"}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPatient || isSaving || isSendingEmr}
                      onClick={handleSaveSingleGeneratedRecord}
                      className="min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:min-h-0"
                    >
                      {isSaving ? "저장 중..." : "현재 기록지 저장"}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPatient || isSaving || isSendingEmr}
                      onClick={handleSaveAllGeneratedRecords}
                      className="min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:min-h-0"
                    >
                      {isSaving
                        ? "저장 중..."
                        : generatedDraft.sessionTemplateIds.length > 1
                          ? `일괄 저장 (${generatedDraft.sessionTemplateIds.length}건)`
                          : "전체 저장"}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {activeDraftTemplateIdResolved
                    ? (
                        generatedDraft.fieldsByTemplateId[
                          activeDraftTemplateIdResolved
                        ] ?? []
                      ).map((field) => {
                          const unitSuffix = field.unit?.trim() ? ` (${field.unit})` : "";
                          const tid = activeDraftTemplateIdResolved;
                          return (
                            <div
                              key={field.storageKey}
                              className="py-4 first:pt-0 last:pb-0"
                            >
                              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                {field.label}
                                {unitSuffix}
                              </label>
                              <TemplateFieldControl
                                field={field}
                                templateId={tid}
                                patientId={
                                  selectedPatient ? Number(selectedPatient.id) : undefined
                                }
                                value={
                                  generatedDraft.draftsByTemplateId[tid]?.[
                                    field.storageKey
                                  ] ?? ""
                                }
                                onChange={(nextValue) =>
                                  setGeneratedDraft((prev) =>
                                    prev && tid
                                      ? {
                                          ...prev,
                                          draftsByTemplateId: {
                                            ...prev.draftsByTemplateId,
                                            [tid]: {
                                              ...(prev.draftsByTemplateId[tid] ?? {}),
                                              [field.storageKey]: nextValue,
                                            },
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </div>
                          );
                        },
                      )
                    : null}
                </div>
              </div>
            ) : null}
          </div>

          {generatedDraft && generationMeta && audioPlaybackUrl ? (
            <aside className="max-h-[min(100vh,800px)] min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
              <div className="mb-3">
                <p
                  className="truncate text-lg font-semibold text-gray-900"
                  title={generationMeta.fileName}
                >
                  {stripFileExtension(generationMeta.fileName)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {generationMeta.sourceType === "recording" ? "녹음" : "파일"} ·{" "}
                  {formatDateTime(generationMeta.createdAtIso)}
                </p>
              </div>
              <audio
                ref={audioRef}
                controls
                src={audioPlaybackUrl}
                className="w-full"
                onTimeUpdate={(event) => {
                  setCurrentPlaybackSec(Number(event.currentTarget.currentTime));
                }}
              />
              <div className="mt-3">
                <VoiceTranscriptBlocks
                  segments={generatedDraft.sttSegments}
                  activeSegmentId={activeSegmentId}
                  onSelectSegment={(segment) => {
                    if (!audioRef.current) return;
                    audioRef.current.currentTime = segment.startSec;
                    setCurrentPlaybackSec(segment.startSec);
                    setActiveSegmentId(segment.id);
                  }}
                  className="max-h-[calc(100vh-22rem)] space-y-1.5 overflow-y-auto pr-1"
                />
              </div>
            </aside>
          ) : null}
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="flex-1" aria-hidden />
      </div>

      {!generatedDraft && !isGenerating && !isSaving ? (
        <div
          className="mt-auto w-full border-t border-gray-200 bg-white/95 px-0 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-2 sm:py-4 sm:pb-4"
          role="region"
          aria-label="녹음"
        >
          <div
            className="mx-auto flex w-full max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-[9999px] border border-gray-200 bg-gray-50 px-3 py-2.5 shadow-sm sm:w-[30%] sm:min-w-[280px] sm:max-w-[480px] sm:justify-between sm:gap-x-3 sm:px-4 sm:py-3"
          >
            <div className="min-w-[64px] shrink-0 text-sm font-semibold tabular-nums text-gray-800">
              {formatDuration(recordingSec)}
            </div>

            <button
              type="button"
              disabled={!canStartVoiceCapture || isGenerating}
              onClick={toggleRecording}
              className={`inline-flex h-11 min-w-[120px] shrink-0 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition-colors sm:h-12 sm:min-w-[140px] sm:flex-none sm:px-6 ${
                recordingState === "recording"
                  ? "bg-gray-700 hover:bg-gray-800"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:cursor-not-allowed disabled:bg-gray-300`}
            >
              {recordingState === "recording"
                ? "일시정지"
                : recordingState === "paused"
                  ? "녹음 재개"
                  : "녹음 시작"}
            </button>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={recordingState === "idle" || isGenerating}
                onClick={completeRecording}
                className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                완료
              </button>
              <button
                type="button"
                disabled={recordingState === "idle" || isGenerating}
                onClick={cancelRecording}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SelectPatientForVoiceModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        patients={patients}
        onConfirm={(patient) => {
          setSelectedPatient(patient);
        }}
      />
      <SelectVoiceRecordTemplatesModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        templates={availableTemplates}
        selectedTemplateIds={selectedTemplates}
        maxCount={3}
        disabled={templateSelectionLocked}
        onAddTemplate={(id) => {
          setSelectedTemplates((prev) => {
            if (prev.includes(id)) return prev;
            if (prev.length >= 3) return prev;
            return [...prev, id];
          });
        }}
      />
    </div>
  );
}
