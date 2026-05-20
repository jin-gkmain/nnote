import type { SttEngineChoice } from "@/app/data/stt-engine-preference";

export interface AiTemplateFieldSpec {
  key: string;
  label: string;
  description?: string;
  /** template_fill 제약용 — fields_json 의 type 과 동일 */
  valueType?: string;
  /** radio / checkbox / selectbox 허용 키 */
  optionKeys?: string[];
}

export interface AiStructuredHint {
  key: string;
  value: string;
  confidence: number;
  source: "rule" | "input";
}

export interface AiDraftRequest {
  text: string;
  type: "sbar" | "soapie" | "observation" | "template_fill" | "transcript_digest";
  templateFields?: AiTemplateFieldSpec[];
  structuredHints?: AiStructuredHint[];
}

export interface AiDraftResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export async function requestAiDraft<T = Record<string, unknown>>(
  payload: AiDraftRequest,
): Promise<T> {
  const response = await fetch("/api/ai-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as AiDraftResponse<T>;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || result.error || "AI 처리에 실패했습니다.");
  }
  return result.data;
}

export interface SttWordTimestamp {
  startSec: number;
  endSec: number;
  word: string;
  confidence?: number;
}

export interface SttSegment {
  id: string;
  speaker: string;
  speakerLabel: string;
  startSec: number;
  endSec: number;
  text: string;
  words: SttWordTimestamp[];
}

export interface SttSpeakerSummary {
  speaker: string;
  label: string;
  totalSpeechSec: number;
  segmentCount: number;
}

export interface SttMeta {
  engine: string;
  language: string;
  audioDurationSec: number;
  processingMs: number;
  modelVersion: string;
}

export interface SttResponse {
  text: string;
  filename: string;
  segments: SttSegment[];
  speakers: SttSpeakerSummary[];
  meta: SttMeta | null;
}

export async function requestStt(
  audio: File | Blob,
  options?: { engine?: SttEngineChoice },
): Promise<SttResponse> {
  const formData = new FormData();
  formData.append(
    "audio",
    audio,
    audio instanceof File ? audio.name : `recording_${Date.now()}.wav`,
  );
  if (options?.engine) {
    formData.append("stt_engine", options.engine);
  }
  const response = await fetch("/api/stt", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as {
    success?: boolean;
    text?: string;
    filename?: string;
    segments?: Array<{
      id?: string;
      speaker?: string;
      speakerLabel?: string;
      startSec?: number;
      endSec?: number;
      text?: string;
      words?: Array<{
        startSec?: number;
        endSec?: number;
        word?: string;
        confidence?: number;
      }>;
    }>;
    speakers?: Array<{
      speaker?: string;
      label?: string;
      totalSpeechSec?: number;
      segmentCount?: number;
    }>;
    meta?: {
      engine?: string;
      language?: string;
      audioDurationSec?: number;
      processingMs?: number;
      modelVersion?: string;
    };
    message?: string;
    error?: string;
  };
  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error || "음성 변환에 실패했습니다.");
  }
  const text = String(result.text ?? "").trim();
  if (!text) throw new Error("음성에서 텍스트를 인식하지 못했습니다.");
  const segments: SttSegment[] = Array.isArray(result.segments)
    ? result.segments
        .filter((segment) => Number.isFinite(segment.startSec) && Number.isFinite(segment.endSec))
        .map((segment, index) => ({
          id: String(segment.id ?? `segment-${index + 1}`),
          speaker: String(segment.speaker ?? "SPEAKER_UNKNOWN"),
          speakerLabel: String(segment.speakerLabel ?? "화자 미지정"),
          startSec: Number(segment.startSec ?? 0),
          endSec: Number(segment.endSec ?? 0),
          text: String(segment.text ?? "").trim(),
          words: Array.isArray(segment.words)
            ? segment.words
                .filter((word) => Number.isFinite(word.startSec) && Number.isFinite(word.endSec))
                .map((word) => ({
                  startSec: Number(word.startSec ?? 0),
                  endSec: Number(word.endSec ?? 0),
                  word: String(word.word ?? "").trim(),
                  confidence: Number.isFinite(word.confidence)
                    ? Number(word.confidence)
                    : undefined,
                }))
            : [],
        }))
    : [];
  const speakers: SttSpeakerSummary[] = Array.isArray(result.speakers)
    ? result.speakers.map((speaker) => ({
        speaker: String(speaker.speaker ?? "SPEAKER_UNKNOWN"),
        label: String(speaker.label ?? "화자 미지정"),
        totalSpeechSec: Number(speaker.totalSpeechSec ?? 0),
        segmentCount: Number(speaker.segmentCount ?? 0),
      }))
    : [];
  const meta: SttMeta | null = result.meta
    ? {
        engine: String(result.meta.engine ?? "unknown"),
        language: String(result.meta.language ?? "unknown"),
        audioDurationSec: Number(result.meta.audioDurationSec ?? 0),
        processingMs: Number(result.meta.processingMs ?? 0),
        modelVersion: String(result.meta.modelVersion ?? "unknown"),
      }
    : null;
  return {
    text,
    filename: String(result.filename ?? (audio instanceof File ? audio.name : "")),
    segments,
    speakers,
    meta,
  };
}

export async function requestOcr(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as {
    success?: boolean;
    fullText?: string;
    message?: string;
    error?: string;
  };
  if (!response.ok || !result.success) {
    throw new Error(result.error || result.message || "OCR 처리에 실패했습니다.");
  }
  const fullText = String(result.fullText ?? "").trim();
  if (!fullText) throw new Error("이미지에서 텍스트를 인식하지 못했습니다.");
  return fullText;
}
