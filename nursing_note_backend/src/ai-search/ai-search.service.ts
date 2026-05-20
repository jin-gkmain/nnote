import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import type { AutocompleteRequestDto, AutocompleteResponseDto } from './autocomplete.dto';

interface QdrantPoint {
  id: string;
  score: number;
  payload?: { text?: string };
}

@Injectable()
export class AiSearchService {
  private readonly qdrantUrl: string;
  private readonly qdrantApiKey: string;
  private readonly qdrantCollection: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DB_POOL) private readonly pool: mariadb.Pool,
  ) {
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL', '').replace(/\/$/, '');
    this.qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY', '');
    this.qdrantCollection = this.configService.get<string>('QDRANT_COLLECTION', 'nursing-autocomplete');
  }

  async suggest(dto: AutocompleteRequestDto, userId: number): Promise<AutocompleteResponseDto> {
    const startedAt = Date.now();
    const normalizedCurrentText = dto.currentText.trim();
    const fallback = await this.buildFallbackSuggestion(dto, userId);
    if (!this.qdrantUrl) {
      return {
        suggestion: fallback,
        source: 'fallback',
        score: fallback ? 0.4 : 0,
        latencyMs: Date.now() - startedAt,
      };
    }
    const queryVector = this.textToVector(
      `${dto.templateId} ${dto.fieldKey} ${normalizedCurrentText} ${dto.patientContext ?? ''} ${dto.recentRecordContext ?? ''}`,
    );
    const qdrantResults = await this.queryQdrant(queryVector);
    const best = qdrantResults
      .map((point) => ({
        text: this.pickCompletionTail(normalizedCurrentText, point.payload?.text ?? ''),
        score: point.score,
      }))
      .find((item) => item.text.length > 0);
    if (!best) {
      return {
        suggestion: fallback,
        source: 'fallback',
        score: fallback ? 0.4 : 0,
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      suggestion: best.text,
      source: 'qdrant',
      score: best.score,
      latencyMs: Date.now() - startedAt,
    };
  }

  private async queryQdrant(vector: number[]): Promise<QdrantPoint[]> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.qdrantApiKey) headers['api-key'] = this.qdrantApiKey;
      const res = await fetch(`${this.qdrantUrl}/collections/${this.qdrantCollection}/points/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vector,
          limit: 5,
          with_payload: true,
          score_threshold: 0.3,
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json().catch(() => null)) as { result?: QdrantPoint[] } | null;
      return data?.result ?? [];
    } catch {
      return [];
    }
  }

  private textToVector(text: string): number[] {
    const dim = 64;
    const vector = Array.from({ length: dim }, () => 0);
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 1) {
      const code = chars[i].charCodeAt(0);
      const idx = code % dim;
      vector[idx] += (code % 97) / 97;
    }
    const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0)) || 1;
    return vector.map((value) => value / norm);
  }

  private pickCompletionTail(currentText: string, candidate: string): string {
    const normalizedCandidate = candidate.trim();
    if (!normalizedCandidate) return '';
    if (!normalizedCandidate.startsWith(currentText)) return '';
    const tail = normalizedCandidate.slice(currentText.length).trimStart();
    return tail.slice(0, 120);
  }

  private async buildFallbackSuggestion(dto: AutocompleteRequestDto, _userId: number): Promise<string | null> {
    const conn = await this.pool.getConnection();
    try {
      const hasPatientFilter = dto.patientId != null;
      const rows = (await conn.query(
        `SELECT data
         FROM records
         WHERE record_type = ?
           AND (? IS NULL OR patient_id = ?)
         ORDER BY id DESC
         LIMIT 30`,
        [dto.templateId, hasPatientFilter ? dto.patientId : null, hasPatientFilter ? dto.patientId : null],
      )) as { data: string }[];
      const values: string[] = [];
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.data) as Record<string, unknown>;
          const value = String(parsed[dto.fieldKey] ?? '').trim();
          if (value) values.push(value);
        } catch {
          continue;
        }
      }
      const currentText = dto.currentText.trim();
      const matched = values.find((value) => value.startsWith(currentText) && value.length > currentText.length);
      if (!matched) return null;
      return matched.slice(currentText.length).trimStart().slice(0, 120);
    } finally {
      conn.release();
    }
  }
}
