import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Mic,
  Pause,
} from "lucide-react";
import { useAuth } from "@/app/auth/auth-context";
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
  DEMO_VOICE_SCRIPTS,
  type DemoVoiceScript,
} from "@/app/data/demoVoiceScripts";
import {
  buildAiTemplateFieldPayload,
  fetchTemplateUiConfigMap,
  mergeTemplateFieldOverrides,
  splitTemplateLabel,
  type TemplateFieldEffective,
} from "@/app/data/template-field-registry";
import { VoiceTranscriptBlocks } from "@/app/components/voice-transcript-blocks";
import type { SttMeta, SttSegment, SttSpeakerSummary } from "@/app/data/ai-api";
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

function isTemplateTextField(field: TemplateFieldEffective): boolean {
  return (
    field.inputKind === "text_short" ||
    field.inputKind === "text_long"
  );
}

function normalizeDraftTextForReuse(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .trim();
}

function looksLikeReusableClinicalSentence(value: string): boolean {
  const normalized = normalizeDraftTextForReuse(value);
  if (normalized.length < 14) return false;
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  if (/^(있음|없음|해당 없음|예|아니오)$/i.test(normalized)) return false;
  return /[가-힣A-Za-z]/.test(normalized);
}

function suppressRepeatedTextFieldValues(
  fields: TemplateFieldEffective[],
  values: Record<string, string>,
): Record<string, string> {
  const next = { ...values };
  const used = new Set<string>();
  for (const field of fields) {
    if (!isTemplateTextField(field)) continue;
    const key = field.storageKey;
    const value = String(next[key] ?? "").trim();
    if (!looksLikeReusableClinicalSentence(value)) continue;
    const normalized = normalizeDraftTextForReuse(value);
    if (used.has(normalized)) {
      next[key] = "";
      continue;
    }
    used.add(normalized);
  }
  return next;
}

function groupTemplateFieldsBySection(
  fields: TemplateFieldEffective[],
): Array<{ section: string; fields: TemplateFieldEffective[] }> {
  return fields.reduce<Array<{ section: string; fields: TemplateFieldEffective[] }>>(
    (groups, field) => {
      const { section } = splitTemplateLabel(field.label);
      const last = groups[groups.length - 1];
      if (last && last.section === section) {
        last.fields.push(field);
      } else {
        groups.push({ section, fields: [field] });
      }
      return groups;
    },
    [],
  );
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

type GenerationSourceType = "file" | "recording" | "demo_script";

/** 생성 완료 후 파일첨부 자리에 표시하는 메타 */
interface GenerationMeta {
  fileName: string;
  createdAtIso: string;
  sourceType: GenerationSourceType;
  /** 녹음 완료 시에만 초 단위 길이, 파일 업로드 시 null */
  durationSec: number | null;
}

interface RecordingHistoryItem {
  id: string;
  sourceType: GenerationSourceType;
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
type VoiceFlowStep = "templates" | "capture";
type VoiceInputMode = "record" | "upload";
type LiveTranscriptStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "paused"
  | "unsupported"
  | "error"
  | "stopped";
type LiveTranscriptProvider = "idle" | "whisperlivekit" | "browser";

const EXCLUDED_VOICE_TEMPLATE_IDS = new Set(["SOAP", "SOAPIE", "SBAR", "SOPA"]);

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WhisperLiveLine {
  speaker?: number;
  text?: string | null;
  start?: string;
  end?: string;
}

interface WhisperLiveMessage {
  type?: "config" | "snapshot" | "diff" | "ready_to_stop" | string;
  status?: string;
  lines?: WhisperLiveLine[];
  new_lines?: WhisperLiveLine[];
  buffer_transcription?: string;
  buffer_diarization?: string;
  error?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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

function appendTranscript(prev: string, next: string): string {
  const cleanNext = next.trim();
  if (!cleanNext) return prev;
  const cleanPrev = prev.trim();
  if (!cleanPrev) return cleanNext;
  return `${cleanPrev} ${cleanNext}`;
}

function buildWhisperLiveKitSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/asr?language=ko&mode=full`;
}

function textFromWhisperLiveLines(lines: WhisperLiveLine[] | undefined): string {
  if (!lines?.length) return "";
  return lines
    .map((line) => (typeof line.text === "string" ? line.text.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function transcriptFromDemoScript(script: DemoVoiceScript): string {
  return script.lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");
}

function previewFromDemoScript(script: DemoVoiceScript): string {
  return script.lines
    .slice(0, 2)
    .map((line) => `${line.speaker}: ${line.text}`)
    .join(" ");
}

function estimateDemoLineDurationSec(text: string): number {
  return Math.max(2, Math.min(8, Math.ceil(text.length / 18)));
}

function segmentsFromDemoScript(script: DemoVoiceScript): SttSegment[] {
  let cursor = 0;
  return script.lines.map((line, index) => {
    const duration = estimateDemoLineDurationSec(line.text);
    const startSec = cursor;
    const endSec = cursor + duration;
    cursor = endSec;
    return {
      id: `${script.id}-${index + 1}`,
      speaker: line.speaker,
      speakerLabel: line.speaker,
      startSec,
      endSec,
      text: line.text,
      words: [],
    };
  });
}

function speakerSummaryFromSegments(segments: SttSegment[]): SttSpeakerSummary[] {
  const map = new Map<string, SttSpeakerSummary>();
  for (const segment of segments) {
    const prev = map.get(segment.speaker) ?? {
      speaker: segment.speaker,
      label: segment.speakerLabel,
      totalSpeechSec: 0,
      segmentCount: 0,
    };
    prev.totalSpeechSec += Math.max(0, segment.endSec - segment.startSec);
    prev.segmentCount += 1;
    map.set(segment.speaker, prev);
  }
  return [...map.values()];
}

function demoScriptMeta(script: DemoVoiceScript, segments: SttSegment[]): SttMeta {
  return {
    engine: "demo-script",
    language: "ko-KR",
    audioDurationSec: segments.at(-1)?.endSec ?? 0,
    processingMs: 0,
    modelVersion: script.sourceSheet,
  };
}

function generationSourceLabel(sourceType: GenerationSourceType): string {
  if (sourceType === "recording") return "녹음";
  if (sourceType === "demo_script") return "데모 스크립트";
  return "파일";
}

export default function VoiceRecordPage() {
  const { user, token } = useAuth();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [flowStep, setFlowStep] = useState<VoiceFlowStep>("templates");
  const [inputMode, setInputMode] = useState<VoiceInputMode>("record");
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
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterimTranscript, setLiveInterimTranscript] = useState("");
  const [liveTranscriptStatus, setLiveTranscriptStatus] =
    useState<LiveTranscriptStatus>("idle");
  const [liveTranscriptNotice, setLiveTranscriptNotice] = useState("");
  const [liveTranscriptPanelOpen, setLiveTranscriptPanelOpen] = useState(false);
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

  const liveTranscriptScrollRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const liveSttSocketRef = useRef<WebSocket | null>(null);
  const liveSttProviderRef = useRef<LiveTranscriptProvider>("idle");
  const pendingLiveAudioChunksRef = useRef<Blob[]>([]);
  const liveSocketClosingRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const shouldGenerateOnStopRef = useRef(false);
  const completedDurationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationPhaseRef = useRef(generationPhase);
  generationPhaseRef.current = generationPhase;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;
  const recordingStateRef = useRef(recordingState);
  recordingStateRef.current = recordingState;
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
    return (fromServer.length > 0 ? fromServer : [...VOICE_RECORD_TEMPLATES]).filter(
      (templateId) => !EXCLUDED_VOICE_TEMPLATE_IDS.has(templateId.toUpperCase()),
    );
  }, [templatesMapQuery.data]);

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

  const canStartVoiceCapture = selectedTemplates.length > 0;
  const selectedTemplateLabels = useMemo(
    () =>
      selectedTemplates.map((tid) =>
        classificationLabelForTemplate(tid, templatesMapQuery.data),
      ),
    [selectedTemplates, templatesMapQuery.data],
  );

  const templateSelectionLocked =
    !!generatedDraft || isGenerating || recordingState !== "idle";

  const toggleTemplateSelection = useCallback((templateId: VoiceRecordTemplateId) => {
    if (templateSelectionLocked) return;
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      if (prev.length >= 3) {
        setError("서식은 최대 3개까지 선택할 수 있습니다.");
        return prev;
      }
      setError("");
      return [...prev, templateId];
    });
  }, [templateSelectionLocked]);

  const goToCaptureStep = useCallback(() => {
    if (selectedTemplates.length === 0) {
      setError("생성할 서식을 하나 이상 선택해 주세요.");
      return;
    }
    setError("");
    setFlowStep("capture");
  }, [selectedTemplates.length]);

  const activeDraftTemplateIdResolved = useMemo(() => {
    const ids = generatedDraft?.sessionTemplateIds;
    if (!ids?.length) return null;
    if (activeDraftTemplateId && ids.includes(activeDraftTemplateId)) {
      return activeDraftTemplateId;
    }
    return ids[0] ?? null;
  }, [generatedDraft, activeDraftTemplateId]);

  useEffect(() => {
    if (!generatedDraft) {
      setRecordTitlesByTemplateId({});
      voiceTitleSessionByTemplateRef.current = {};
      return;
    }
    const genKey = generatedDraft.generatedAt;
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
  }, [generatedDraft, templatesMapQuery.data]);

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

  const stopLiveSpeechRecognition = useCallback((nextStatus: LiveTranscriptStatus = "stopped") => {
    const recognition = speechRecognitionRef.current;
    setLiveInterimTranscript("");
    if (!recognition) {
      setLiveTranscriptStatus((prev) =>
        prev === "unsupported" || prev === "error" ? prev : nextStatus,
      );
      return;
    }
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.stop();
    } catch {
      // 이미 종료된 경우 브라우저가 예외를 던질 수 있습니다.
    }
    speechRecognitionRef.current = null;
    setLiveTranscriptStatus(nextStatus);
  }, []);

  const startLiveSpeechRecognition = useCallback((opts?: { reset?: boolean }) => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (opts?.reset) {
      setLiveTranscript("");
    }
    liveSttProviderRef.current = "browser";
    setLiveInterimTranscript("");
    if (!Recognition) {
      liveSttProviderRef.current = "idle";
      setLiveTranscriptStatus("unsupported");
      setLiveTranscriptNotice(
        "이 브라우저는 실시간 전사를 지원하지 않습니다. 완료 후 서버 STT로 전사됩니다.",
      );
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = String(result?.[0]?.transcript ?? "");
        if (!transcript) continue;
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) {
        setLiveTranscript((prev) => appendTranscript(prev, finalText));
      }
      setLiveInterimTranscript(interimText.trim());
    };
    recognition.onerror = () => {
      setLiveTranscriptStatus("error");
      setLiveTranscriptNotice(
        "실시간 전사가 일시 중단되었습니다. 녹음 완료 후 서버 STT로 다시 처리됩니다.",
      );
    };
    recognition.onend = () => {
      if (recordingStateRef.current === "recording") {
        try {
          recognition.start();
        } catch {
          // 일부 브라우저는 빠른 재시작을 막습니다.
        }
      }
    };
    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
      setLiveTranscriptStatus("listening");
      setLiveTranscriptNotice(
        "실시간 서버 연결이 어려워 브라우저 전사를 사용합니다. 완료 후 서버 STT로 확정 처리됩니다.",
      );
    } catch {
      liveSttProviderRef.current = "idle";
      setLiveTranscriptStatus("error");
      setLiveTranscriptNotice(
        "실시간 전사를 시작하지 못했습니다. 녹음 완료 후 서버 STT로 처리됩니다.",
      );
    }
  }, []);

  const stopWhisperLiveKitTranscription = useCallback(
    (nextStatus: LiveTranscriptStatus = "stopped") => {
      const socket = liveSttSocketRef.current;
      liveSocketClosingRef.current = true;
      pendingLiveAudioChunksRef.current = [];
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(new ArrayBuffer(0));
          }
          if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
          ) {
            socket.close(1000, "recording stopped");
          }
        } catch {
          // 종료 중 발생하는 네트워크 예외는 무시합니다.
        }
      }
      liveSttSocketRef.current = null;
      if (liveSttProviderRef.current === "whisperlivekit") {
        liveSttProviderRef.current = "idle";
        setLiveInterimTranscript("");
        setLiveTranscriptStatus(nextStatus);
      }
      window.setTimeout(() => {
        liveSocketClosingRef.current = false;
      }, 0);
    },
    [],
  );

  const sendLiveAudioChunk = useCallback((chunk: Blob) => {
    const socket = liveSttSocketRef.current;
    if (!socket || liveSttProviderRef.current !== "whisperlivekit") return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(chunk);
      return;
    }

    if (socket.readyState === WebSocket.CONNECTING) {
      pendingLiveAudioChunksRef.current = [
        ...pendingLiveAudioChunksRef.current.slice(-8),
        chunk,
      ];
    }
  }, []);

  const startWhisperLiveKitTranscription = useCallback(
    (opts?: { reset?: boolean }): boolean => {
      if (opts?.reset) {
        setLiveTranscript("");
      }
      setLiveInterimTranscript("");
      setLiveTranscriptNotice("실시간 전사 서버에 연결 중입니다.");
      setLiveTranscriptStatus("connecting");
      pendingLiveAudioChunksRef.current = [];
      liveSocketClosingRef.current = false;

      try {
        const socket = new WebSocket(buildWhisperLiveKitSocketUrl());
        let opened = false;
        liveSttProviderRef.current = "whisperlivekit";
        liveSttSocketRef.current = socket;

        socket.onopen = () => {
          opened = true;
          setLiveTranscriptStatus("listening");
          setLiveTranscriptNotice("");
          const pending = pendingLiveAudioChunksRef.current;
          pendingLiveAudioChunksRef.current = [];
          for (const chunk of pending) {
            if (socket.readyState !== WebSocket.OPEN) break;
            socket.send(chunk);
          }
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== "string") return;
          let payload: WhisperLiveMessage;
          try {
            payload = JSON.parse(event.data) as WhisperLiveMessage;
          } catch {
            return;
          }
          if (payload.type === "config") return;
          if (payload.type === "ready_to_stop") {
            setLiveInterimTranscript("");
            return;
          }
          if (payload.error) {
            setLiveTranscriptStatus("error");
            setLiveTranscriptNotice(
              `실시간 전사 서버 오류: ${payload.error}. 완료 후 서버 STT로 다시 처리됩니다.`,
            );
            return;
          }
          const committedText = textFromWhisperLiveLines(payload.lines);
          if (committedText) {
            setLiveTranscript(committedText);
          } else if (payload.new_lines?.length) {
            const newText = textFromWhisperLiveLines(payload.new_lines);
            if (newText) setLiveTranscript((prev) => appendTranscript(prev, newText));
          }
          setLiveInterimTranscript(
            String(payload.buffer_transcription ?? payload.buffer_diarization ?? "").trim(),
          );
          if (payload.status === "no_audio_detected") {
            setLiveTranscriptNotice("음성이 감지되면 전사가 시작됩니다.");
          } else if (payload.status === "active_transcription") {
            setLiveTranscriptNotice("");
          }
        };

        socket.onerror = () => {
          if (liveSocketClosingRef.current) return;
          if (!opened) {
            liveSttSocketRef.current = null;
            pendingLiveAudioChunksRef.current = [];
            startLiveSpeechRecognition({ reset: false });
            return;
          }
          setLiveTranscriptStatus("error");
          setLiveTranscriptNotice(
            "실시간 전사 서버 연결이 끊겼습니다. 완료 후 서버 STT로 확정 처리됩니다.",
          );
        };

        socket.onclose = () => {
          if (liveSttSocketRef.current === socket) {
            liveSttSocketRef.current = null;
          }
          pendingLiveAudioChunksRef.current = [];
          if (liveSocketClosingRef.current) return;
          if (!opened && recordingStateRef.current === "recording") {
            startLiveSpeechRecognition({ reset: false });
            return;
          }
          if (recordingStateRef.current === "recording") {
            setLiveTranscriptStatus("error");
            setLiveTranscriptNotice(
              "실시간 전사 서버 연결이 종료되었습니다. 완료 후 서버 STT로 확정 처리됩니다.",
            );
          }
        };
        return true;
      } catch {
        liveSttProviderRef.current = "idle";
        liveSttSocketRef.current = null;
        startLiveSpeechRecognition({ reset: false });
        return false;
      }
    },
    [startLiveSpeechRecognition],
  );

  const startLiveTranscription = useCallback(
    (opts?: { reset?: boolean }) => {
      if (liveSttSocketRef.current) {
        stopWhisperLiveKitTranscription("idle");
      }
      if (speechRecognitionRef.current) {
        stopLiveSpeechRecognition("idle");
      }
      startWhisperLiveKitTranscription(opts);
    },
    [
      startWhisperLiveKitTranscription,
      stopLiveSpeechRecognition,
      stopWhisperLiveKitTranscription,
    ],
  );

  const pauseLiveTranscription = useCallback(() => {
    if (liveSttProviderRef.current === "whisperlivekit") {
      setLiveTranscriptStatus("paused");
      return;
    }
    stopLiveSpeechRecognition("paused");
  }, [stopLiveSpeechRecognition]);

  const resumeLiveTranscription = useCallback(() => {
    const socket = liveSttSocketRef.current;
    if (
      liveSttProviderRef.current === "whisperlivekit" &&
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      setLiveTranscriptStatus(
        socket.readyState === WebSocket.OPEN ? "listening" : "connecting",
      );
      return;
    }
    startLiveTranscription();
  }, [startLiveTranscription]);

  const stopLiveTranscription = useCallback(
    (nextStatus: LiveTranscriptStatus = "stopped") => {
      stopWhisperLiveKitTranscription(nextStatus);
      stopLiveSpeechRecognition(nextStatus);
      liveSttProviderRef.current = "idle";
    },
    [stopLiveSpeechRecognition, stopWhisperLiveKitTranscription],
  );

  const generateDraftFromTranscript = useCallback(
    async (input: {
      transcript: string;
      fileName: string;
      sourceType: GenerationSourceType;
      durationSec?: number;
      sttSegments: SttSegment[];
      sttSpeakers: SttSpeakerSummary[];
      sttMeta: SttMeta | null;
      attachedFile?: File | null;
      audioUrl?: string | null;
    }) => {
      const templatesForSession = selectedTemplates.filter((id) =>
        availableTemplates.includes(id),
      ) as VoiceRecordTemplateId[];
      if (templatesForSession.length === 0) {
        setError("템플릿을 하나 이상 선택해 주세요.");
        return;
      }

      setIsGenerating(true);
      setGenerationPhase("digest");
      setTemplateFillProgress(null);
      setError("");
      setAttachedFile(input.attachedFile ?? null);
      setGeneratedDraft(null);
      setGenerationMeta(null);
      setActiveDraftTemplateId(null);
      if (audioPlaybackUrl) {
        URL.revokeObjectURL(audioPlaybackUrl);
      }
      setAudioPlaybackUrl(input.audioUrl ?? null);
      setCurrentPlaybackSec(0);
      setActiveSegmentId(null);

      try {
        const digestRaw = await aiDraftMutation.mutateAsync({
          text: input.transcript,
          type: "transcript_digest",
        });
        const sharedDigest =
          digestRaw &&
          typeof digestRaw === "object" &&
          !Array.isArray(digestRaw) &&
          digestRaw !== null
            ? (digestRaw as Record<string, unknown>)
            : null;

        const combinedBase = buildCombinedTextForTemplateFill(
          sharedDigest,
          input.transcript,
        );
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
            const structuredHints = buildStructuredHintsFromTemplate(
              merged,
              input.transcript,
            );
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
              draftsByTemplateId[tid] = suppressRepeatedTextFieldValues(
                merged,
                templateValues,
              );
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
          transcript: input.transcript,
          generatedAt,
          sttSegments: input.sttSegments,
          sttSpeakers: input.sttSpeakers,
          sttMeta: input.sttMeta,
        });
        setActiveDraftTemplateId(templatesForSession[0] ?? null);
        setGenerationMeta({
          fileName: input.fileName,
          createdAtIso: generatedAt,
          sourceType: input.sourceType,
          durationSec:
            input.sourceType === "recording" && typeof input.durationSec === "number"
              ? input.durationSec
              : null,
        });

        pushHistory({
          sourceType: input.sourceType,
          fileName: input.fileName,
          createdAt: new Date().toISOString(),
          durationSec: input.durationSec,
          status: "success",
          transcript: input.transcript,
          sttSegments: input.sttSegments,
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
          sourceType: input.sourceType,
          fileName: input.fileName,
          createdAt: new Date().toISOString(),
          durationSec: input.durationSec,
          status: "failed",
          message,
          transcript: input.transcript,
          sttSegments: input.sttSegments,
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
    ],
  );

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

      try {
        const sttResult = await sttMutation.mutateAsync({
          audio: file,
          engine: getPreferredSttEngine(),
        });
        await generateDraftFromTranscript({
          transcript: sttResult.text,
          fileName: file.name,
          sourceType,
          durationSec,
          sttSegments: sttResult.segments,
          sttSpeakers: sttResult.speakers,
          sttMeta: sttResult.meta,
          attachedFile: file,
          audioUrl: URL.createObjectURL(file),
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "음성 변환에 실패했습니다.";
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
        });
        setTemplateFillProgress(null);
        setIsGenerating(false);
      }
    },
    [
      availableTemplates,
      generateDraftFromTranscript,
      pushHistory,
      selectedTemplates,
      sttMutation,
    ],
  );

  const generateDraftFromDemoScript = useCallback(
    async (script: DemoVoiceScript) => {
      const segments = segmentsFromDemoScript(script);
      await generateDraftFromTranscript({
        transcript: transcriptFromDemoScript(script),
        fileName: script.title,
        sourceType: "demo_script",
        sttSegments: segments,
        sttSpeakers: speakerSummaryFromSegments(segments),
        sttMeta: demoScriptMeta(script, segments),
      });
    },
    [generateDraftFromTranscript],
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
      stopLiveTranscription();
      if (audioPlaybackUrl) {
        URL.revokeObjectURL(audioPlaybackUrl);
      }
    };
  }, [audioPlaybackUrl, stopLiveTranscription]);

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
          sendLiveAudioChunk(event.data);
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

      recorder.start(500);
      setRecordingSec(0);
      setRecordingState("recording");
      startLiveTranscription({ reset: true });
    } catch {
      setError(
        "마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해 주세요.",
      );
    }
  }, [generateDraftFromAudio, sendLiveAudioChunk, startLiveTranscription]);

  const toggleRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      await startNewRecording();
      return;
    }

    if (recordingState === "recording" && recorder.state === "recording") {
      recorder.pause();
      setRecordingState("paused");
      pauseLiveTranscription();
      return;
    }

    if (recordingState === "paused" && recorder.state === "paused") {
      recorder.resume();
      setRecordingState("recording");
      resumeLiveTranscription();
    }
  }, [pauseLiveTranscription, recordingState, resumeLiveTranscription, startNewRecording]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    shouldGenerateOnStopRef.current = false;
    completedDurationRef.current = 0;
    setLiveTranscript("");
    setLiveInterimTranscript("");
    setLiveTranscriptNotice("");

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      stopLiveTranscription("idle");
    } else {
      setRecordingState("idle");
      setRecordingSec(0);
      chunksRef.current = [];
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      stopLiveTranscription("idle");
    }
  }, [stopLiveTranscription]);

  const completeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    shouldGenerateOnStopRef.current = true;
    completedDurationRef.current = recordingSec;
    stopLiveTranscription("stopped");
    recorder.stop();
  }, [recordingSec, stopLiveTranscription]);

  const saveGeneratedRecordByTemplateId = useCallback(
    async (templateId: VoiceRecordTemplateId): Promise<number> => {
      if (!generatedDraft) {
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
      generatedDraft,
      attachedFile,
      recordTitlesByTemplateId,
      createRecordMutation,
    ],
  );

  const saveAllGeneratedRecords = useCallback(async (): Promise<number[]> => {
    if (!generatedDraft) {
      throw new Error("저장할 초안이 없습니다.");
    }
    const createdIds: number[] = [];
    for (const tid of generatedDraft.sessionTemplateIds) {
      const createdId = await saveGeneratedRecordByTemplateId(tid);
      createdIds.push(createdId);
    }
    return createdIds;
  }, [generatedDraft, saveGeneratedRecordByTemplateId]);

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
  }, [audioPlaybackUrl]);

  const handleSaveSingleGeneratedRecord = useCallback(async () => {
    if (!generatedDraft || !activeDraftTemplateIdResolved) return;
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
      if (generatedDraft.sessionTemplateIds.length === 1) {
        clearGeneratedOutput();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    generatedDraft,
    activeDraftTemplateIdResolved,
    saveGeneratedRecordByTemplateId,
    clearGeneratedOutput,
  ]);

  const handleSaveAllGeneratedRecords = useCallback(async () => {
    if (!generatedDraft) return;
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
  }, [generatedDraft, saveAllGeneratedRecords, clearGeneratedOutput]);

  const handleSendEmrGeneratedRecord = useCallback(async () => {
    if (!generatedDraft) return;
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
  }, [generatedDraft, saveAllGeneratedRecords, clearGeneratedOutput, updateEmrMutation]);

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
  const liveStatusMeta = useMemo(() => {
    if (recordingState === "recording") {
      return { label: "듣는 중", dot: "bg-[#EF4444]", text: "text-[#EF4444]" };
    }
    if (recordingState === "paused") {
      return { label: "일시정지", dot: "bg-[#F59E0B]", text: "text-[#B45309]" };
    }
    if (liveTranscriptStatus === "connecting") {
      return { label: "연결 중", dot: "bg-[#3B82F6]", text: "text-[#2563EB]" };
    }
    if (liveTranscriptStatus === "unsupported") {
      return { label: "미지원", dot: "bg-[#9CA3AF]", text: "text-[#6B7280]" };
    }
    if (liveTranscriptStatus === "error") {
      return { label: "중단됨", dot: "bg-[#EF4444]", text: "text-[#EF4444]" };
    }
    return { label: "대기", dot: "bg-[#9CA3AF]", text: "text-[#6B7280]" };
  }, [liveTranscriptStatus, recordingState]);
  const showLiveTranscriptDock =
    !generatedDraft && inputMode === "record" && !isGenerating && !isSaving;

  useEffect(() => {
    if (showLiveTranscriptDock && recordingState === "recording") {
      setLiveTranscriptPanelOpen(true);
    }
  }, [recordingState, showLiveTranscriptDock]);

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

  useEffect(() => {
    const el = liveTranscriptScrollRef.current;
    if (!el || !liveTranscriptPanelOpen) return;
    el.scrollTop = el.scrollHeight;
  }, [liveTranscript, liveInterimTranscript, liveTranscriptPanelOpen]);

  if (flowStep === "templates" && !generatedDraft && !isGenerating) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[720px] flex-col text-left lg:max-w-none">
        <div className="mb-7">
          <div className="mb-10 h-2 rounded-full bg-[#E5E7EB]">
            <div className="h-full w-1/3 rounded-full bg-[#1179FF]" />
          </div>
          <h1 className="text-[26px] font-bold leading-tight text-[#111827] sm:text-3xl">
            생성할 서식을 선택해주세요
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[#6B7280]">
            여러 서식을 동시에 생성할 수 있어요 (최대 3개)
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pb-44">
          {availableTemplates.map((templateId) => {
            const selected = selectedTemplates.includes(templateId);
            const disabled = !selected && selectedTemplates.length >= 3;
            return (
              <button
                key={templateId}
                type="button"
                disabled={disabled}
                onClick={() => toggleTemplateSelection(templateId)}
                className={`flex min-h-[56px] items-center justify-between rounded-xl border bg-white px-4 text-left shadow-sm transition active:scale-[0.99] ${
                  selected
                    ? "border-[#3B82F6] ring-2 ring-[#DBEAFE]"
                    : "border-[#E5E7EB]"
                } ${disabled ? "opacity-45" : ""}`}
              >
                <span className="text-[15px] font-semibold text-[#20242C]">
                  {classificationLabelForTemplate(templateId, templatesMapQuery.data)}
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                      : "border-[#8D939E] bg-white"
                  }`}
                >
                  {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="fixed inset-x-0 bottom-[var(--nursing-mobile-tabbar-height)] z-20 border-t border-[#E5E7EB] bg-white/95 px-5 pb-3 pt-3 shadow-[0_-8px_18px_rgba(17,24,39,0.08)] backdrop-blur lg:left-[100px] lg:bottom-0 lg:px-10">
          <div className="mx-auto flex max-w-[720px] items-center gap-3 lg:max-w-none">
            <div className="min-w-[4.5rem] shrink-0">
              <p className="text-xs font-semibold text-[#6B7280]">선택</p>
              <p className="text-sm font-bold text-[#2563EB]">
                {selectedTemplates.length}/3개
              </p>
            </div>
          <button
            type="button"
            disabled={selectedTemplates.length === 0}
            onClick={goToCaptureStep}
              className="h-12 flex-1 rounded-xl bg-[#3B82F6] text-base font-bold text-white shadow-sm transition hover:bg-[#2563EB] disabled:bg-[#EDEDED] disabled:text-[#9CA3AF]"
          >
            선택완료
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[720px] flex-col text-left lg:max-w-none">
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

      <div className="flex w-full max-w-none flex-1 flex-col pt-1">
        <div className="mb-6 h-2 rounded-full bg-[#E5E7EB]">
          <div className="h-full w-3/5 rounded-full bg-[#1179FF]" />
        </div>
        <div className="mb-6 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#E5E7EB] pb-6">
          <button
            type="button"
            onClick={() => {
              if (recordingState !== "idle") return;
              setFlowStep("templates");
              setError("");
            }}
            disabled={recordingState !== "idle" || isGenerating || isSaving}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#1179FF] disabled:text-[#D1D5DB]"
            aria-label="서식 선택으로 돌아가기"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.25} />
          </button>
          <h1 className="text-center text-[26px] font-bold leading-tight text-[#20242C]">
            음성 기록
          </h1>
          <span className="h-11 w-11" aria-hidden />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {selectedTemplateLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-[#1179FF]"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-2 rounded-lg bg-[#F3F4F6] p-1 text-sm font-bold text-[#6B7280]">
          <button
            type="button"
            onClick={() => setInputMode("record")}
            disabled={recordingState !== "idle" || isGenerating}
            className={`h-11 rounded-md transition ${
              inputMode === "record"
                ? "bg-white text-[#20242C] shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            직접 녹음
          </button>
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            disabled={recordingState !== "idle" || isGenerating}
            className={`h-11 rounded-md transition ${
              inputMode === "upload"
                ? "bg-white text-[#20242C] shadow-sm"
                : "text-[#6B7280]"
            }`}
          >
            파일 업로드
          </button>
        </div>

        {!generatedDraft && inputMode === "record" ? (
          <section className="mb-3 flex flex-col items-center">
            <div className="mt-3 text-[56px] font-bold leading-none tracking-tight text-[#20242C] sm:text-[88px]">
              {formatDuration(recordingSec)}
            </div>
            <div className="mt-8 flex h-5 w-full max-w-full items-center justify-center gap-1.5 overflow-hidden sm:gap-2">
              {Array.from({ length: 28 }).map((_, index) => {
                const active = recordingState === "recording" && index % 5 !== 0;
                return (
                  <span
                    key={index}
                    className={`rounded-full ${
                      active ? "h-2 w-1.5 bg-[#3B82F6]" : "h-1.5 w-1.5 bg-[#D1D5DB]"
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              disabled={!canStartVoiceCapture || isGenerating}
              onClick={toggleRecording}
              className={`mt-6 flex h-28 w-28 items-center justify-center rounded-full text-white shadow-[0_0_0_10px_rgba(239,68,68,0.10)] transition active:scale-95 sm:h-36 sm:w-36 ${
                recordingState === "recording"
                  ? "bg-[#EF4444]"
                  : "bg-[#DBEAFE] text-[#20242C]"
              } disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]`}
              aria-label={recordingState === "recording" ? "녹음 일시정지" : "녹음 시작"}
            >
              {recordingState === "recording" ? (
                <Pause className="h-11 w-11 sm:h-14 sm:w-14" fill="currentColor" strokeWidth={0} />
              ) : (
                <Mic className="h-12 w-12 sm:h-16 sm:w-16" strokeWidth={1.8} />
              )}
            </button>
            <p className="mt-3 text-base text-[#6B7280] sm:text-lg">
              {recordingState === "recording"
                ? "녹음 중..."
                : recordingState === "paused"
                  ? "탭하여 녹음 재개"
                  : "탭하여 녹음 시작"}
            </p>
          </section>
        ) : null}

        {!generatedDraft && inputMode === "upload" ? (
          <section className="mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#20242C]">데모 스크립트 선택</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                선택한 대화 스크립트로 STT 없이 바로 간호기록지 초안을 생성합니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {DEMO_VOICE_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  disabled={!canStartVoiceCapture || isGenerating}
                  onClick={() => generateDraftFromDemoScript(script)}
                  className="mobile-app-card min-h-[132px] p-4 text-left transition hover:border-[#93C5FD] hover:bg-[#F8FBFF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]">
                      <FileText className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#20242C]">
                        {script.title}
                      </span>
                      <span className="mt-1 line-clamp-3 block text-xs leading-5 text-[#6B7280]">
                        {previewFromDemoScript(script)}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {generatedDraft ? (
          <div className="mb-6 grid w-full flex-1 gap-4 lg:grid-cols-4 lg:items-start">
            <div className="min-w-0 space-y-4 lg:col-span-3">
              {generationMeta ? (
              <div className="mobile-app-card p-5">
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
                      placeholder="분류-일시 형식으로 기본 채움"
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
                      disabled={isSaving || isSendingEmr || !canSendEmr}
                      onClick={handleSendEmrGeneratedRecord}
                      className="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:min-h-0"
                    >
                      {isSendingEmr ? "전송 중..." : "EMR전송"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || isSendingEmr}
                      onClick={handleSaveSingleGeneratedRecord}
                      className="min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:min-h-0"
                    >
                      {isSaving ? "저장 중..." : "현재 기록지 저장"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || isSendingEmr}
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

                <div className="space-y-5">
                  {activeDraftTemplateIdResolved
                    ? groupTemplateFieldsBySection(
                        generatedDraft.fieldsByTemplateId[
                          activeDraftTemplateIdResolved
                        ] ?? [],
                      ).map(({ section, fields }) => {
                        const tid = activeDraftTemplateIdResolved;
                        return (
                          <section
                            key={section}
                            className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4"
                          >
                            <h3 className="mb-3 text-sm font-bold text-gray-800">
                              {section}
                            </h3>
                            <div className="space-y-4">
                              {fields.map((field) => {
                                const unitSuffix = field.unit?.trim() ? ` (${field.unit})` : "";
                                const { field: fieldLabel } = splitTemplateLabel(field.label);
                                return (
                                  <div
                                    key={field.storageKey}
                                    className="border-t border-gray-200/70 pt-4 first:border-t-0 first:pt-0"
                                  >
                                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                      {fieldLabel}
                                      {unitSuffix}
                                    </label>
                                    <TemplateFieldControl
                                      field={field}
                                      templateId={tid}
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
                              })}
                            </div>
                          </section>
                        );
                      })
                    : null}
                </div>
              </div>
              ) : null}
            </div>

            {generationMeta && generatedDraft.sttSegments.length > 0 ? (
              <aside className="mobile-app-card min-h-0 p-4 lg:col-span-1 lg:max-h-[min(100vh,800px)] lg:overflow-y-auto lg:overscroll-contain">
              <div className="mb-3">
                <p
                  className="truncate text-lg font-semibold text-gray-900"
                  title={generationMeta.fileName}
                >
                  {stripFileExtension(generationMeta.fileName)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {generationSourceLabel(generationMeta.sourceType)} ·{" "}
                  {formatDateTime(generationMeta.createdAtIso)}
                </p>
              </div>
              {audioPlaybackUrl ? (
                <audio
                  ref={audioRef}
                  controls
                  src={audioPlaybackUrl}
                  className="w-full"
                  onTimeUpdate={(event) => {
                    setCurrentPlaybackSec(Number(event.currentTarget.currentTime));
                  }}
                />
              ) : null}
              <div className="mt-3">
                <VoiceTranscriptBlocks
                  segments={generatedDraft.sttSegments}
                  activeSegmentId={activeSegmentId}
                  onSelectSegment={(segment) => {
                    if (!audioRef.current) {
                      setActiveSegmentId(segment.id);
                      return;
                    }
                    audioRef.current.currentTime = segment.startSec;
                    setCurrentPlaybackSec(segment.startSec);
                    setActiveSegmentId(segment.id);
                  }}
                  className={`space-y-1.5 lg:overflow-y-auto lg:pr-1 ${
                    audioPlaybackUrl ? "lg:max-h-[calc(100vh-22rem)]" : "lg:max-h-[calc(100vh-17rem)]"
                  }`}
                />
              </div>
              </aside>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="flex-1" aria-hidden />
      </div>

      {showLiveTranscriptDock ? (
        <>
        {!liveTranscriptPanelOpen ? (
          <button
            type="button"
            onClick={() => setLiveTranscriptPanelOpen(true)}
            className="fixed bottom-[calc(var(--nursing-mobile-tabbar-height)+0.85rem)] right-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DBEAFE] bg-white px-4 text-sm font-bold text-[#2563EB] shadow-[0_8px_24px_rgba(37,99,235,0.18)] lg:hidden"
            aria-expanded="false"
            aria-controls="live-transcript-panel"
          >
            <span className={`h-2 w-2 rounded-full ${liveStatusMeta.dot}`} />
            실시간 전사
            <ChevronUp className="h-4 w-4" strokeWidth={2.4} />
          </button>
        ) : null}
        <section
          id="live-transcript-panel"
          className={`${liveTranscriptPanelOpen ? "fixed" : "hidden"} inset-x-0 bottom-[var(--nursing-mobile-tabbar-height)] z-20 max-h-[min(72dvh,520px)] overflow-hidden rounded-t-3xl border border-[#E5E7EB] bg-white shadow-[0_-8px_24px_rgba(17,24,39,0.12)] lg:static lg:mt-auto lg:block lg:max-h-none lg:overflow-hidden lg:shadow-[0_-4px_12px_rgba(17,24,39,0.05)]`}
        >
          <div className="mx-auto mt-1 h-1 w-20 rounded-full bg-[#D1D5DB] sm:h-1.5 sm:w-24" />
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-2.5 sm:py-3">
            <h2 className="text-base font-bold text-[#111827] sm:text-xl">실시간 전사</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-bold ${liveStatusMeta.text}`}>
                <span className={`h-2 w-2 rounded-full ${liveStatusMeta.dot}`} />
                {liveStatusMeta.label}
              </span>
              <button
                type="button"
                onClick={() => setLiveTranscriptPanelOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] lg:hidden"
                aria-label="실시간 전사 닫기"
                aria-expanded="true"
                aria-controls="live-transcript-panel"
              >
                <ChevronDown className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
          </div>
          <div
            ref={liveTranscriptScrollRef}
            className="max-h-[calc(min(72dvh,520px)-9.75rem)] min-h-[132px] overflow-y-auto px-5 py-3 sm:px-7 sm:py-8 lg:max-h-[220px] lg:min-h-[178px]"
            aria-live="polite"
          >
            {liveTranscript || liveInterimTranscript ? (
              <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#20242C] sm:text-[18px] sm:leading-8">
                {liveTranscript}
                {liveInterimTranscript ? (
                  <span className="text-[#6B7280]"> {liveInterimTranscript}</span>
                ) : null}
              </p>
            ) : (
              <div className="flex min-h-[72px] flex-col items-center justify-center text-center sm:min-h-[120px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-[#9CA3AF] sm:h-16 sm:w-16">
                  <Mic className="h-5 w-5 sm:h-8 sm:w-8" strokeWidth={1.8} />
                </div>
                <p className="mt-2 text-xs font-medium text-[#9CA3AF] sm:mt-6 sm:text-base">
                  녹음이 시작되면 여기에 전사가 표시됩니다
                </p>
                <p className="mt-1 text-[11px] text-[#9CA3AF] sm:mt-2 sm:text-xs">
                  완료 후 서버 STT로 다시 확정 처리합니다.
                </p>
              </div>
            )}
            {liveTranscriptNotice ? (
              <p className="mt-4 rounded-lg bg-[#EFF6FF] px-3 py-2 text-xs text-[#2563EB]">
                {liveTranscriptNotice}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#E5E7EB] px-6 py-2">
            <button
              type="button"
              disabled={recordingState === "idle" || isGenerating}
              onClick={cancelRecording}
              className="h-11 rounded-2xl border border-[#E5E7EB] bg-white text-base font-bold text-[#111827] disabled:text-[#D1D5DB] sm:h-14 sm:text-lg"
            >
              취소
            </button>
            <button
              type="button"
              disabled={recordingState === "idle" || isGenerating}
              onClick={completeRecording}
              className="h-11 rounded-2xl bg-[#3B82F6] text-base font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] sm:h-14 sm:text-lg"
            >
              완료
            </button>
          </div>
        </section>
        </>
      ) : null}

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
