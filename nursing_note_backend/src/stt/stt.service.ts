import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

/**
 * STT (Speech-to-Text) 서비스
 *
 * 음성 파일을 STT provider에 전송하여 텍스트로 변환
 * - 기본 provider: 로컬 WhisperX
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
  private readonly STT_PROVIDER = String(process.env.STT_PROVIDER || 'legacy').toLowerCase();
  private readonly CLOVA_SPEECH_INVOKE_URL = process.env.CLOVA_SPEECH_INVOKE_URL || '';
  private readonly CLOVA_SPEECH_SECRET_KEY = process.env.CLOVA_SPEECH_SECRET_KEY || '';
  private readonly CLOVA_SPEECH_LANGUAGE = process.env.CLOVA_SPEECH_LANGUAGE || 'ko-KR';
  private readonly CLOVA_CSR_URL =
    process.env.CLOVA_CSR_URL || 'https://naveropenapi.apigw.ntruss.com/recog/v1/stt';
  private readonly CLOVA_CSR_CLIENT_ID = process.env.CLOVA_CSR_CLIENT_ID || '';
  private readonly CLOVA_CSR_CLIENT_SECRET = process.env.CLOVA_CSR_CLIENT_SECRET || '';
  private readonly CLOVA_CSR_LANGUAGE = process.env.CLOVA_CSR_LANGUAGE || 'Kor';

  /**
   * 음성 파일 → 텍스트 변환
   *
   * @param file - multer가 파싱한 업로드 파일
   * @returns { text, filename } - 변환된 텍스트와 파일명
   */
  async transcribe(file: Express.Multer.File, sttEngine?: string): Promise<SttServiceResult> {
    if (this.STT_PROVIDER === 'clova-speech') {
      return this.transcribeWithClovaSpeech(file);
    }
    if (this.STT_PROVIDER === 'clova-csr') {
      return this.transcribeWithClovaCsr(file);
    }

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
        if (
          error.code === 'ECONNRESET' ||
          error.code === 'EPIPE' ||
          String(error.message || '').toLowerCase().includes('socket hang up')
        ) {
          throw new BadRequestException(
            'STT 서버 연결이 중간에 끊겼습니다. WhisperX 컨테이너 리소스 또는 모델 설정을 확인하세요.',
          );
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

  /** 클라이언트 엔진 선택값은 legacy STT 호환용으로만 사용합니다. */
  private resolveSttEngine(_client?: string): string {
    if (this.STT_PROVIDER === 'clova-speech' || this.STT_PROVIDER === 'clova-csr') {
      return this.STT_PROVIDER;
    }
    return 'whisperx';
  }

  private async transcribeWithClovaSpeech(file: Express.Multer.File): Promise<SttServiceResult> {
    if (!this.CLOVA_SPEECH_INVOKE_URL.trim() || !this.CLOVA_SPEECH_SECRET_KEY.trim()) {
      throw new BadRequestException(
        'CLOVA Speech 설정이 필요합니다. CLOVA_SPEECH_INVOKE_URL, CLOVA_SPEECH_SECRET_KEY를 확인하세요.',
      );
    }

    const startedAt = Date.now();
    const formData = new FormData();
    const params = this.buildClovaSpeechParams();
    formData.append('params', JSON.stringify(params), {
      contentType: 'application/json',
    });
    formData.append('media', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype || 'audio/wav',
    });

    console.log(
      `🎙️ CLOVA Speech STT 요청 — 파일: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`,
    );

    try {
      const response = await axios.post(this.buildClovaSpeechUploadUrl(), formData, {
        headers: {
          ...formData.getHeaders(),
          'X-CLOVASPEECH-API-KEY': this.CLOVA_SPEECH_SECRET_KEY,
        },
        timeout: this.STT_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const parsed = this.parseSttResponse(
        {
          ...(this.readAsObject(response.data)),
          meta: {
            engine: 'clova-speech',
            language: this.CLOVA_SPEECH_LANGUAGE,
            processingMs: Date.now() - startedAt,
            modelVersion: String((response.data as Record<string, unknown>)?.version ?? 'clova-speech'),
          },
        },
        file,
      );
      console.log(`✅ CLOVA Speech STT 완료 — ${parsed.text.length}자 추출`);
      return parsed;
    } catch (error) {
      this.throwSttRequestError(error, 'CLOVA Speech');
    }
  }

  private async transcribeWithClovaCsr(file: Express.Multer.File): Promise<SttServiceResult> {
    if (!this.CLOVA_CSR_CLIENT_ID.trim() || !this.CLOVA_CSR_CLIENT_SECRET.trim()) {
      throw new BadRequestException(
        'CLOVA CSR 설정이 필요합니다. CLOVA_CSR_CLIENT_ID, CLOVA_CSR_CLIENT_SECRET를 확인하세요.',
      );
    }
    const startedAt = Date.now();
    console.log(
      `🎙️ CLOVA CSR STT 요청 — 파일: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`,
    );
    try {
      const response = await axios.post(
        `${this.CLOVA_CSR_URL}?lang=${encodeURIComponent(this.CLOVA_CSR_LANGUAGE)}`,
        file.buffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-NCP-APIGW-API-KEY-ID': this.CLOVA_CSR_CLIENT_ID,
            'X-NCP-APIGW-API-KEY': this.CLOVA_CSR_CLIENT_SECRET,
          },
          timeout: this.STT_TIMEOUT,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );
      const parsed = this.parseSttResponse(
        {
          ...(this.readAsObject(response.data)),
          meta: {
            engine: 'clova-csr',
            language: this.CLOVA_CSR_LANGUAGE,
            processingMs: Date.now() - startedAt,
            modelVersion: 'clova-csr',
          },
        },
        file,
      );
      console.log(`✅ CLOVA CSR STT 완료 — ${parsed.text.length}자 추출`);
      return parsed;
    } catch (error) {
      this.throwSttRequestError(error, 'CLOVA CSR');
    }
  }

  private buildClovaSpeechUploadUrl(): string {
    const base = this.CLOVA_SPEECH_INVOKE_URL.trim().replace(/\/+$/, '');
    return base.endsWith('/recognizer/upload') ? base : `${base}/recognizer/upload`;
  }

  private buildClovaSpeechParams(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      language: this.CLOVA_SPEECH_LANGUAGE,
      completion: 'sync',
      callback: '',
      fullText: true,
    };
    const raw = process.env.CLOVA_SPEECH_PARAMS_JSON;
    if (!raw?.trim()) return base;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return base;
      }
      return { ...base, ...(parsed as Record<string, unknown>) };
    } catch {
      return base;
    }
  }

  private throwSttRequestError(error: unknown, providerName: string): never {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new BadRequestException(`${providerName} 응답 타임아웃`);
      }
      const data = error.response?.data;
      const detail =
        typeof data === 'string'
          ? data
          : data && typeof data === 'object'
            ? JSON.stringify(data)
            : '';
      throw new BadRequestException(
        detail
          ? `${providerName} 오류 (${error.response?.status ?? 'unknown'}): ${detail}`
          : `${providerName} 오류 (${error.response?.status || 'unknown'})`,
      );
    }
    throw new BadRequestException(
      error instanceof Error ? error.message : `${providerName} 처리 중 오류 발생`,
    );
  }

  private parseSttResponse(raw: unknown, file: Express.Multer.File): SttServiceResult {
    const result = this.readAsObject(raw);
    const text = this.parseText(result.text);
    const filename =
      typeof result.filename === 'string' && result.filename.trim().length > 0
        ? result.filename
        : file.originalname;
    const segments = this.parseSegments(result.segments);
    const normalizedSegments =
      segments.length > 0
        ? segments
        : [
            {
              id: 'seg_0001',
              speaker: 'SPEAKER_UNKNOWN',
              speakerLabel: '화자 미지정',
              startSec: 0,
              endSec: 0,
              text,
              words: [],
            },
          ];
    const speakers = this.parseSpeakers(result.speakers);
    const normalizedSpeakers =
      speakers.length > 0
        ? speakers
        : [
            {
              speaker: 'SPEAKER_UNKNOWN',
              label: '화자 미지정',
              totalSpeechSec: 0,
              segmentCount: normalizedSegments.length,
            },
          ];
    const meta = this.parseMeta(result, normalizedSegments);
    return {
      text,
      filename,
      segments: normalizedSegments,
      speakers: normalizedSpeakers,
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
    const startSec = this.normalizeTimeSec(segment.startSec ?? segment.start ?? 0);
    const endSec = this.normalizeTimeSec(segment.endSec ?? segment.end ?? startSec);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      return null;
    }
    const words = this.parseWords(segment.words);
    return {
      id: String(segment.id ?? `seg_${index + 1}`),
      speaker: this.parseSpeakerId(segment.speaker),
      speakerLabel: this.parseSpeakerLabel(segment.speakerLabel ?? segment.label ?? segment.speaker),
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
      const startSec = this.normalizeTimeSec(wordData.startSec ?? wordData.start ?? 0);
      const endSec = this.normalizeTimeSec(wordData.endSec ?? wordData.end ?? startSec);
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
        const speakerId = this.parseSpeakerId(item.speaker);
        return {
          speaker: speakerId,
          label: this.parseSpeakerLabel(item.label ?? item.speakerLabel ?? item.speaker),
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
        engine: this.STT_PROVIDER === 'legacy'
          ? (this.USE_PYTHON_STT ? 'whisperx+pyannote' : 'legacy-stt')
          : this.STT_PROVIDER,
        language: String(result.language ?? this.STT_LANGUAGE),
        audioDurationSec,
        processingMs: 0,
        modelVersion: 'unknown',
      };
    }
    const meta = rawMeta as Record<string, unknown>;
    return {
      engine: String(meta.engine ?? this.STT_PROVIDER),
      language: String(meta.language ?? result.language ?? this.STT_LANGUAGE),
      audioDurationSec:
        Number(meta.audioDurationSec ?? result.duration_sec ?? audioDurationSec) || audioDurationSec,
      processingMs: Number(meta.processingMs ?? meta.processing_ms ?? 0) || 0,
      modelVersion: String(meta.modelVersion ?? meta.model ?? 'unknown'),
    };
  }

  private normalizeTimeSec(raw: unknown): number {
    const value = Number(raw);
    if (!Number.isFinite(value)) return 0;
    return value > 1000 ? value / 1000 : value;
  }

  private parseSpeakerId(raw: unknown): string {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      return String(obj.label ?? obj.name ?? 'SPEAKER_UNKNOWN');
    }
    return String(raw ?? 'SPEAKER_UNKNOWN');
  }

  private parseSpeakerLabel(raw: unknown): string {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      const value = obj.name ?? obj.label;
      return value == null ? '화자 미지정' : `화자 ${String(value)}`;
    }
    if (raw == null || String(raw).trim() === '' || String(raw) === 'SPEAKER_UNKNOWN') {
      return '화자 미지정';
    }
    return String(raw).startsWith('화자 ') ? String(raw) : `화자 ${String(raw)}`;
  }
}
