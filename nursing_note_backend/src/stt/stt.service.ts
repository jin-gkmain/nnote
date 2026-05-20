import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

/**
 * STT (Speech-to-Text) 서비스
 *
 * 음성 파일을 외부 STT 서버에 전송하여 텍스트로 변환
 * - 외부 서버: http://gkmain.iptime.org:3005/stt/plain
 * - 입력: 음성 파일 (wav, webm, mp3 등)
 * - 출력: 변환된 텍스트
 */
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

export interface SttServiceResult {
  text: string;
  filename: string;
  segments: SttSegment[];
  speakers: SttSpeakerSummary[];
  meta: SttMeta | null;
}

@Injectable()
export class SttService {
  private readonly DEFAULT_STT_SERVER_URL = 'https://ahk-ai.ai-tank.co.kr/stt/diarize';
  private readonly STT_SERVER_URL =
    process.env.PY_STT_API_URL || process.env.STT_SERVER_URL || this.DEFAULT_STT_SERVER_URL;
  private readonly STT_LANGUAGE = process.env.STT_LANGUAGE || 'ko';
  private readonly STT_TIMEOUT = Number(process.env.PY_STT_TIMEOUT_MS ?? 180_000);
  private readonly USE_PYTHON_STT = this.STT_SERVER_URL.includes('/v1/transcribe');

  /**
   * 음성 파일 → 텍스트 변환
   *
   * @param file - multer가 파싱한 업로드 파일
   * @returns { text, filename } - 변환된 텍스트와 파일명
   */
  async transcribe(file: Express.Multer.File, sttEngine?: string): Promise<SttServiceResult> {
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype || 'audio/wav',
    });
    if (this.USE_PYTHON_STT) {
      formData.append('language', this.STT_LANGUAGE);
      formData.append('stt_engine', this.resolveSttEngine(sttEngine));
    }

    console.log(
      `🎙️ STT 요청 — 파일: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB), 엔진: ${this.resolveSttEngine(sttEngine)}`,
    );

    try {
      const response = await axios.post(this.buildSttUrl(), formData, {
        headers: formData.getHeaders(),
        timeout: this.STT_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const parsed = this.parseSttResponse(response.data, file);
      console.log(`✅ STT 완료 — ${parsed.text.length}자 추출`);
      return parsed;
    } catch (error) {
      // axios 에러 → 의미 있는 메시지로 변환
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new BadRequestException('STT 서버 응답 타임아웃 (3분 초과)');
        }
        if (error.code === 'ECONNREFUSED') {
          throw new BadRequestException('STT 서버에 연결할 수 없습니다.');
        }
        const data = error.response?.data;
        const detail =
          data &&
          typeof data === 'object' &&
          'detail' in data &&
          (data as { detail: unknown }).detail != null
            ? String((data as { detail: unknown }).detail)
            : '';
        throw new BadRequestException(
          detail
            ? `STT 서버 오류 (${error.response?.status ?? 'unknown'}): ${detail}`
            : `STT 서버 오류 (${error.response?.status || 'unknown'})`,
        );
      }

      // 이미 BadRequestException이면 그대로 throw
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'STT 처리 중 오류 발생',
      );
    }
  }

  private buildSttUrl(): string {
    if (this.USE_PYTHON_STT) {
      return this.STT_SERVER_URL;
    }
    return `${this.STT_SERVER_URL}?language=${this.STT_LANGUAGE}`;
  }

  /** Python STT 서비스는 WhisperX만 지원합니다. */
  private resolveSttEngine(_client?: string): string {
    return 'whisperx';
  }

  private parseSttResponse(raw: unknown, file: Express.Multer.File): SttServiceResult {
    const result = this.readAsObject(raw);
    const text = this.parseText(result.text);
    const filename =
      typeof result.filename === 'string' && result.filename.trim().length > 0
        ? result.filename
        : file.originalname;
    const segments = this.parseSegments(result.segments);
    const speakers = this.parseSpeakers(result.speakers);
    const meta = this.parseMeta(result, segments);
    return {
      text,
      filename,
      segments,
      speakers,
      meta,
    };
  }

  private readAsObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('STT 서버 응답 형식이 올바르지 않습니다.');
    }
    return raw as Record<string, unknown>;
  }

  private parseText(textValue: unknown): string {
    if (typeof textValue !== 'string' || textValue.trim().length === 0) {
      throw new BadRequestException('음성에서 텍스트를 인식하지 못했습니다.');
    }
    return textValue.trim();
  }

  private parseSegments(rawSegments: unknown): SttSegment[] {
    if (!Array.isArray(rawSegments)) {
      return [];
    }
    return rawSegments
      .map((segment, index) => this.parseSegment(segment, index))
      .filter((segment): segment is SttSegment => segment !== null);
  }

  private parseSegment(rawSegment: unknown, index: number): SttSegment | null {
    if (!rawSegment || typeof rawSegment !== 'object') {
      return null;
    }
    const segment = rawSegment as Record<string, unknown>;
    const startSec = Number(segment.startSec ?? segment.start ?? 0);
    const endSec = Number(segment.endSec ?? segment.end ?? startSec);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      return null;
    }
    const words = this.parseWords(segment.words);
    return {
      id: String(segment.id ?? `seg_${index + 1}`),
      speaker: String(segment.speaker ?? 'SPEAKER_UNKNOWN'),
      speakerLabel: String(segment.speakerLabel ?? segment.label ?? '화자 미지정'),
      startSec,
      endSec,
      text: String(segment.text ?? '').trim(),
      words,
    };
  }

  private parseWords(rawWords: unknown): SttWordTimestamp[] {
    if (!Array.isArray(rawWords)) {
      return [];
    }
    const parsedWords: SttWordTimestamp[] = [];
    rawWords.forEach((word) => {
      if (!word || typeof word !== 'object') {
        return;
      }
      const wordData = word as Record<string, unknown>;
      const startSec = Number(wordData.startSec ?? wordData.start ?? 0);
      const endSec = Number(wordData.endSec ?? wordData.end ?? startSec);
      if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
        return;
      }
      const confidenceRaw = Number(wordData.confidence ?? wordData.score);
      parsedWords.push({
        startSec,
        endSec,
        word: String(wordData.word ?? '').trim(),
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : undefined,
      });
    });
    return parsedWords;
  }

  private parseSpeakers(rawSpeakers: unknown): SttSpeakerSummary[] {
    if (!Array.isArray(rawSpeakers)) {
      return [];
    }
    return rawSpeakers
      .map((speaker) => {
        if (!speaker || typeof speaker !== 'object') {
          return null;
        }
        const item = speaker as Record<string, unknown>;
        return {
          speaker: String(item.speaker ?? 'SPEAKER_UNKNOWN'),
          label: String(item.label ?? item.speakerLabel ?? '화자 미지정'),
          totalSpeechSec: Number(item.totalSpeechSec ?? 0),
          segmentCount: Number(item.segmentCount ?? 0),
        };
      })
      .filter((speaker): speaker is SttSpeakerSummary => speaker !== null);
  }

  private parseMeta(
    result: Record<string, unknown>,
    segments: SttSegment[],
  ): SttMeta | null {
    const rawMeta = result.meta;
    const audioDurationSec = segments.reduce(
      (maxSec, segment) => Math.max(maxSec, segment.endSec),
      0,
    );
    if (!rawMeta || typeof rawMeta !== 'object') {
      return {
        engine: this.USE_PYTHON_STT ? 'whisperx+pyannote' : 'legacy-stt',
        language: String(result.language ?? this.STT_LANGUAGE),
        audioDurationSec,
        processingMs: 0,
        modelVersion: 'unknown',
      };
    }
    const meta = rawMeta as Record<string, unknown>;
    return {
      engine: String(meta.engine ?? 'whisperx+pyannote'),
      language: String(meta.language ?? result.language ?? this.STT_LANGUAGE),
      audioDurationSec:
        Number(meta.audioDurationSec ?? result.duration_sec ?? audioDurationSec) || audioDurationSec,
      processingMs: Number(meta.processingMs ?? meta.processing_ms ?? 0) || 0,
      modelVersion: String(meta.modelVersion ?? meta.model ?? 'unknown'),
    };
  }
}
