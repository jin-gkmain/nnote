import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import {
  type AbbreviationEntry,
  type UpdateAbbreviationsDto,
  validateAbbreviationPayload,
} from './abbreviations.dto';

export interface UserInputAssistSettings {
  enabled: boolean;
  entries: AbbreviationEntry[];
}

@Injectable()
export class AbbreviationsService implements OnModuleInit {
  constructor(@Inject(DB_POOL) private readonly pool: mariadb.Pool) {}

  async onModuleInit(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS user_input_assist_settings (
          user_id INT NOT NULL PRIMARY KEY,
          autocomplete_enabled TINYINT(1) NOT NULL DEFAULT 1,
          abbreviations_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    } finally {
      conn.release();
    }
  }

  async getByUserId(userId: number): Promise<UserInputAssistSettings> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        `SELECT autocomplete_enabled, abbreviations_json
         FROM user_input_assist_settings
         WHERE user_id = ?`,
        [userId],
      )) as { autocomplete_enabled: number; abbreviations_json: string }[];

      if (!rows.length) return { enabled: true, entries: [] };
      const row = rows[0];
      try {
        const parsed = JSON.parse(row.abbreviations_json) as AbbreviationEntry[];
        if (!Array.isArray(parsed)) return { enabled: Boolean(row.autocomplete_enabled), entries: [] };
        return { enabled: Boolean(row.autocomplete_enabled), entries: parsed };
      } catch {
        return { enabled: Boolean(row.autocomplete_enabled), entries: [] };
      }
    } finally {
      conn.release();
    }
  }

  async upsertByUserId(userId: number, dto: UpdateAbbreviationsDto): Promise<{ ok: true }> {
    validateAbbreviationPayload(dto);
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO user_input_assist_settings (user_id, autocomplete_enabled, abbreviations_json)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           autocomplete_enabled = VALUES(autocomplete_enabled),
           abbreviations_json = VALUES(abbreviations_json),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, dto.enabled === false ? 0 : 1, JSON.stringify(dto.entries)],
      );
      return { ok: true };
    } finally {
      conn.release();
    }
  }
}
