import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import { CreateTemplateUiTemplateDto } from './dto/create-template-ui-template.dto';
import { UpdateTemplateUiDto } from './dto/update-template-ui.dto';
import {
  BUILTIN_LOCKED_TEMPLATE_IDS,
  DEFAULT_TEMPLATE_IDS,
  isValidTemplateId,
} from './template-ui-keys';
import {
  isCanonicalTemplateValueType,
  normalizeTemplateValueType,
  type TemplateValueType,
} from './template-value-type';

export type { TemplateValueType };

/**
 * 3중 JSON 저장 모델.
 * { 대주제: { 소주제: { type, description?, options? } } }
 * — radio / checkbox / selectbox 는 options 에 최소 1개 키 필요(저장 시 검증).
 */
export interface TemplateColumnDef {
  type: TemplateValueType;
  description?: string;
  /** 선택지: 키=저장값·표시 라벨, 값=보조 문자열(빈 문자열 허용). choice 타입 외에는 저장 시 생략 */
  options?: Record<string, string>;
}
export type TemplateSectionMap = Record<string, Record<string, TemplateColumnDef>>;

export interface TemplateUiConfigMeta {
  templateId: string;
  /** 관리자가 지정한 표시용 제목(null이면 UI에서 templateId로 표시) */
  displayTitle: string | null;
  sections: TemplateSectionMap | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TemplateSectionPreset {
  presetId: string;
  category: 'common' | 'patient' | 'extra';
  title: string;
  sections: TemplateSectionMap;
}

const DESCRIPTION_MAX_LENGTH = 500;

const CHOICE_TEMPLATE_TYPES: ReadonlySet<TemplateValueType> = new Set([
  'radio',
  'checkbox',
  'selectbox',
]);

@Injectable()
export class TemplateUiService implements OnModuleInit {
  constructor(@Inject(DB_POOL) private readonly pool: mariadb.Pool) {}

  async onModuleInit(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS template_ui_configs (
          template_id VARCHAR(64) NOT NULL PRIMARY KEY,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fields_json LONGTEXT NOT NULL,
          display_title VARCHAR(128) NULL DEFAULT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
      await conn.query(
        `ALTER TABLE template_ui_configs
         ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
      await conn.query(
        `ALTER TABLE template_ui_configs
         ADD COLUMN IF NOT EXISTS display_title VARCHAR(128) NULL DEFAULT NULL`,
      );
      await conn.query(
        `CREATE TABLE IF NOT EXISTS template_section_presets (
          preset_id VARCHAR(64) NOT NULL PRIMARY KEY,
          category ENUM('common', 'patient', 'extra') NOT NULL DEFAULT 'common',
          title VARCHAR(128) NOT NULL,
          sections_json LONGTEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
      await conn.query(
        `ALTER TABLE template_section_presets
         ADD COLUMN IF NOT EXISTS category ENUM('common', 'patient', 'extra') NOT NULL DEFAULT 'common'`,
      );
      await conn.query(
        `INSERT INTO template_section_presets (preset_id, category, title, sections_json)
         VALUES
         ('doc-common-basic', 'common', '문서 공통 기본', '{"문서공통정보":{"recordDate":"date","recordTime":"text_short","author":"text_long"}}'),
         ('doc-common-emr', 'common', 'EMR 연동 공통', '{"문서공통정보":{"documentNumber":"text_short","emrSync":"boolean"}}'),
         ('patient-profile', 'patient', '환자 프로필', '{"환자정보":{"name":"text_short","age":"number","gender":"text_short","admissionDate":"date"}}'),
         ('patient-vitals', 'patient', '환자 활력징후', '{"환자정보":{"bloodPressure":"text_short","pulse":"number","temperature":"number","respiration":"number"}}'),
         ('extra-nursing-note', 'extra', '추가 간호 메모', '{"추가정보":{"nursingMemo":"text_long","riskFlag":"boolean"}}'),
         ('extra-handover', 'extra', '추가 인계 정보', '{"추가정보":{"handoverSummary":"text_long","nextAction":"text_long"}}')
         ON DUPLICATE KEY UPDATE category = VALUES(category), title = VALUES(title), sections_json = VALUES(sections_json)`,
      );
      await conn.query(
        `CREATE TABLE IF NOT EXISTS template_ui_removed (
          template_id VARCHAR(64) NOT NULL PRIMARY KEY,
          removed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await this.migrateLegacyDescriptionsColumn(conn);
    } finally {
      conn.release();
    }
  }

  /**
   * 직전 단계에서 임시로 분리 보관하던 descriptions_json을 fields_json 안의 3중 구조로 머지하고,
   * 모든 행 변환이 끝난 뒤에만 컬럼 자체를 제거합니다. 이미 컬럼이 없거나 데이터가 3중이면 멱등하게 동작합니다.
   */
  private async migrateLegacyDescriptionsColumn(
    conn: mariadb.PoolConnection,
  ): Promise<void> {
    const hasDescriptionsColumn = await this.descriptionsColumnExists(conn);
    if (!hasDescriptionsColumn) return;

    const rows = (await conn.query(
      'SELECT template_id, fields_json, descriptions_json FROM template_ui_configs',
    )) as {
      template_id: string;
      fields_json: string;
      descriptions_json: string | null;
    }[];

    await conn.beginTransaction();
    try {
      for (const row of rows) {
        const merged = this.mergeLegacyRowToTriple(row.fields_json, row.descriptions_json);
        if (!merged) continue;
        await conn.query(
          'UPDATE template_ui_configs SET fields_json = ? WHERE template_id = ?',
          [merged, row.template_id],
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }

    await conn.query(
      'ALTER TABLE template_ui_configs DROP COLUMN IF EXISTS descriptions_json',
    );
  }

  private async descriptionsColumnExists(conn: mariadb.PoolConnection): Promise<boolean> {
    const rows = (await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'template_ui_configs' AND COLUMN_NAME = 'descriptions_json'`,
    )) as { COLUMN_NAME: string }[];
    return rows.length > 0;
  }

  /**
   * 한 행의 fields_json/descriptions_json을 3중 구조로 합쳐 JSON 문자열로 반환.
   * 이미 3중이면 변경 없음 → null 반환(업데이트 스킵).
   */
  private mergeLegacyRowToTriple(
    fieldsJsonRaw: string,
    descriptionsJsonRaw: string | null,
  ): string | null {
    let parsedFields: unknown;
    try {
      parsedFields = JSON.parse(fieldsJsonRaw);
    } catch {
      return null;
    }
    const descriptions = this.safeParseDescriptions(descriptionsJsonRaw);
    const result: TemplateSectionMap = {};
    let changed = false;
    if (!parsedFields || typeof parsedFields !== 'object' || Array.isArray(parsedFields)) {
      return null;
    }
    for (const [sectionName, columns] of Object.entries(parsedFields as Record<string, unknown>)) {
      if (!columns || typeof columns !== 'object' || Array.isArray(columns)) continue;
      result[sectionName] = {};
      for (const [columnName, raw] of Object.entries(columns as Record<string, unknown>)) {
        if (typeof raw === 'string') {
          // 2중 형식 → 3중으로 승격 (descriptions_json에서 설명 끌어오기)
          const type = this.normalizeRawType(raw) ?? 'text_long';
          if (this.isChoiceTemplateType(type)) {
            result[sectionName][columnName] = { type: 'text_long' };
            changed = true;
            continue;
          }
          const description = descriptions[columnName.trim()] ?? '';
          const def: TemplateColumnDef = { type };
          if (description) def.description = this.clampDescription(description);
          result[sectionName][columnName] = def;
          changed = true;
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const obj = raw as Record<string, unknown>;
          const type = this.normalizeRawType(obj.type) ?? 'text_long';
          const description =
            typeof obj.description === 'string' && obj.description.trim()
              ? this.clampDescription(obj.description)
              : descriptions[columnName.trim()] ?? '';
          const def: TemplateColumnDef = { type };
          if (description) def.description = this.clampDescription(description);
          const opt = this.parseOptionsLenient(obj.options);
          if (opt !== undefined) {
            def.options = opt;
          } else if (this.isChoiceTemplateType(type)) {
            def.options = {};
          }
          result[sectionName][columnName] = def;
          if (!('description' in obj) && description) changed = true;
          if (typeof obj.type === 'string' && obj.type !== type) changed = true;
        } else {
          // 알 수 없는 형식은 text_long으로 보정
          result[sectionName][columnName] = { type: 'text_long' };
          changed = true;
        }
      }
    }
    if (!changed && descriptionsJsonRaw == null) return null;
    return JSON.stringify(result);
  }

  private safeParseDescriptions(raw: string | null): Record<string, string> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v !== 'string') continue;
        const trimmed = v.trim();
        if (!trimmed) continue;
        out[k.trim()] = trimmed;
      }
      return out;
    } catch {
      return {};
    }
  }

  private normalizeRawType(raw: unknown): TemplateValueType | null {
    if (typeof raw !== 'string') return null;
    const s = raw.trim();
    if (s === 'text') return 'text_long';
    return isCanonicalTemplateValueType(s) ? s : null;
  }

  private isChoiceTemplateType(type: TemplateValueType): boolean {
    return CHOICE_TEMPLATE_TYPES.has(type);
  }

  /** DB/GET 읽기: options 는 객체가 아니면 생략, 값은 문자열로 통일 */
  private parseOptionsLenient(raw: unknown): Record<string, string> | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const key = k.trim();
      if (!key) continue;
      out[key] = typeof v === 'string' ? v : String(v ?? '');
    }
    return out;
  }

  /** PUT/POST: choice 타입은 options 필수·비어 있으면 안 됨; 그 외 타입은 options 저장 시 제거 */
  private parseOptionsStrictForDto(
    raw: unknown,
    type: TemplateValueType,
    sectionName: string,
    columnName: string,
  ): Record<string, string> | undefined {
    if (!this.isChoiceTemplateType(type)) {
      return undefined;
    }
    if (raw === undefined || raw === null) {
      throw new BadRequestException(
        `대주제 "${sectionName}" / 소제목 "${columnName}"의 타입 "${type}"에는 options 객체가 필요합니다.`,
      );
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException(
        `대주제 "${sectionName}" / 소제목 "${columnName}"의 options는 객체여야 합니다.`,
      );
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const key = k.trim();
      if (!key) {
        throw new BadRequestException(
          `대주제 "${sectionName}" / 소제목 "${columnName}"의 options에 빈 키는 허용되지 않습니다.`,
        );
      }
      if (typeof v !== 'string') {
        throw new BadRequestException(
          `대주제 "${sectionName}" / 소제목 "${columnName}"의 options 값은 문자열만 허용됩니다.`,
        );
      }
      out[key] = v;
    }
    if (Object.keys(out).length === 0) {
      throw new BadRequestException(
        `대주제 "${sectionName}" / 소제목 "${columnName}"의 타입 "${type}"에는 options에 최소 1개의 선택지가 필요합니다.`,
      );
    }
    return out;
  }

  private clampDescription(text: string): string {
    return text.trim().slice(0, DESCRIPTION_MAX_LENGTH);
  }

  private async loadRemovedTemplateIds(conn: mariadb.PoolConnection): Promise<Set<string>> {
    try {
      const rows = (await conn.query(
        'SELECT template_id FROM template_ui_removed',
      )) as { template_id: string }[];
      return new Set(
        rows.map((r) => String(r.template_id ?? '').trim()).filter((id) => id.length > 0),
      );
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
        return new Set();
      }
      throw e;
    }
  }

  /** 저장된 fields_json이 3중(또는 레거시 2중) 형식 둘 다 받아 sections로 정규화 */
  private parseStoredSectionMap(value: unknown): TemplateSectionMap | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const out: TemplateSectionMap = {};
    let hasAny = false;
    for (const [sectionName, columns] of Object.entries(value as Record<string, unknown>)) {
      if (!sectionName.trim()) return null;
      if (!columns || typeof columns !== 'object' || Array.isArray(columns)) return null;
      const columnEntries = Object.entries(columns as Record<string, unknown>);
      if (!columnEntries.length) return null;
      out[sectionName] = {};
      for (const [columnName, raw] of columnEntries) {
        if (!columnName.trim()) return null;
        if (typeof raw === 'string') {
          const type = this.normalizeRawType(raw) ?? 'text_long';
          if (this.isChoiceTemplateType(type)) {
            out[sectionName][columnName] = { type: 'text_long' };
          } else {
            out[sectionName][columnName] = { type };
          }
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const obj = raw as Record<string, unknown>;
          const type = this.normalizeRawType(obj.type) ?? 'text_long';
          const def: TemplateColumnDef = { type };
          if (typeof obj.description === 'string' && obj.description.trim()) {
            def.description = this.clampDescription(obj.description);
          }
          const opt = this.parseOptionsLenient(obj.options);
          if (opt !== undefined) {
            def.options = opt;
          } else if (this.isChoiceTemplateType(type)) {
            def.options = {};
          }
          out[sectionName][columnName] = def;
        } else {
          return null;
        }
        hasAny = true;
      }
    }
    return hasAny ? out : null;
  }

  /** DTO 입력(2중 string 또는 3중 object 모두 허용)을 3중 정규화하면서 검증 */
  private normalizeDtoSections(
    sections: Record<string, Record<string, unknown>>,
  ): TemplateSectionMap {
    const out: TemplateSectionMap = {};
    for (const [sectionName, columns] of Object.entries(sections)) {
      if (!columns || typeof columns !== 'object' || Array.isArray(columns)) continue;
      out[sectionName] = {};
      for (const [columnName, raw] of Object.entries(columns)) {
        if (typeof raw === 'string') {
          const s = raw.trim();
          if (s === 'text') {
            out[sectionName][columnName] = { type: 'text_long' };
          } else if (isCanonicalTemplateValueType(s)) {
            if (this.isChoiceTemplateType(s)) {
              throw new BadRequestException(
                `대주제 "${sectionName}" / 소제목 "${columnName}"의 타입 "${s}"는 객체 형태와 options가 필요합니다.`,
              );
            }
            out[sectionName][columnName] = { type: s };
          } else {
            throw new BadRequestException(
              `대주제 "${sectionName}" / 소제목 "${columnName}"의 타입이 올바르지 않습니다.`,
            );
          }
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const obj = raw as Record<string, unknown>;
          const typeRaw = typeof obj.type === 'string' ? obj.type.trim() : '';
          let type: TemplateValueType;
          if (typeRaw === 'text') {
            type = 'text_long';
          } else if (isCanonicalTemplateValueType(typeRaw)) {
            type = typeRaw;
          } else {
            throw new BadRequestException(
              `대주제 "${sectionName}" / 소제목 "${columnName}"의 타입이 올바르지 않습니다.`,
            );
          }
          const def: TemplateColumnDef = { type };
          if (typeof obj.description === 'string') {
            const trimmed = obj.description.trim();
            if (trimmed.length > 0) {
              def.description = this.clampDescription(trimmed);
            }
          }
          const strictOpts = this.parseOptionsStrictForDto(
            obj.options,
            type,
            sectionName,
            columnName,
          );
          if (strictOpts !== undefined) {
            def.options = strictOpts;
          }
          out[sectionName][columnName] = def;
        } else {
          throw new BadRequestException(
            `대주제 "${sectionName}" / 소제목 "${columnName}"의 정의가 올바르지 않습니다.`,
          );
        }
      }
    }
    return out;
  }

  private validateSectionPayload(dto: { sections: Record<string, Record<string, unknown>> }): void {
    const raw = dto.sections;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('sections는 객체여야 합니다.');
    }
    const sections: TemplateSectionMap = this.normalizeDtoSections(raw);
    (dto as { sections: TemplateSectionMap }).sections = sections;

    const sectionEntries = Object.entries(sections);
    if (!sectionEntries.length) {
      throw new BadRequestException('최소 1개 이상의 대주제가 필요합니다.');
    }
    const columnNamesGlobal = new Set<string>();
    for (const [sectionName, columns] of sectionEntries) {
      if (!sectionName.trim()) throw new BadRequestException('대주제 이름은 비어 있을 수 없습니다.');
      const columnEntries = Object.entries(columns);
      if (!columnEntries.length) {
        throw new BadRequestException(`대주제 "${sectionName}"에 최소 1개 소제목이 필요합니다.`);
      }
      for (const [columnName] of columnEntries) {
        if (!columnName.trim()) throw new BadRequestException(`대주제 "${sectionName}"의 소제목 이름이 비어 있습니다.`);
        const trimmed = columnName.trim();
        if (columnNamesGlobal.has(trimmed)) {
          throw new BadRequestException(`소제목 "${trimmed}"이(가) 다른 대주제와 중복되었습니다.`);
        }
        columnNamesGlobal.add(trimmed);
      }
    }
  }

  private async findTemplateById(
    conn: mariadb.PoolConnection,
    templateId: string,
  ): Promise<{
    template_id: string;
    fields_json: string;
    display_title: string | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
  } | null> {
    const rows = (await conn.query(
      'SELECT template_id, fields_json, display_title, created_at, updated_at FROM template_ui_configs WHERE template_id = ? LIMIT 1',
      [templateId],
    )) as {
      template_id: string;
      fields_json: string;
      display_title: string | null;
      created_at: Date | string | null;
      updated_at: Date | string | null;
    }[];
    return rows[0] ?? null;
  }

  async findAll(): Promise<Record<string, TemplateUiConfigMeta>> {
    const conn = await this.pool.getConnection();
    try {
      const removed = await this.loadRemovedTemplateIds(conn);
      const rows = (await conn.query(
        'SELECT template_id, fields_json, display_title, created_at, updated_at FROM template_ui_configs',
      )) as {
        template_id: string;
        fields_json: string;
        display_title: string | null;
        created_at: Date | string | null;
        updated_at: Date | string | null;
      }[];
      const out: Record<string, TemplateUiConfigMeta> = {};
      for (const id of DEFAULT_TEMPLATE_IDS) {
        if (removed.has(id)) continue;
        out[id] = {
          templateId: id,
          displayTitle: null,
          sections: null,
          createdAt: null,
          updatedAt: null,
        };
      }
      for (const row of rows) {
        const templateId = String(row.template_id ?? '').trim();
        if (!templateId || removed.has(templateId)) continue;
        const displayTitle =
          row.display_title != null && String(row.display_title).trim() !== ''
            ? String(row.display_title).trim()
            : null;
        let sections: TemplateSectionMap | null = null;
        try {
          const parsed: unknown = JSON.parse(row.fields_json);
          sections = this.parseStoredSectionMap(parsed);
        } catch {
          sections = null;
        }
        out[templateId] = {
          templateId,
          displayTitle,
          sections,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        };
      }
      return out;
    } finally {
      conn.release();
    }
  }

  async createTemplate(dto: CreateTemplateUiTemplateDto): Promise<{ ok: true; templateId: string }> {
    const templateId = dto.templateId.trim();
    if (!isValidTemplateId(templateId)) {
      throw new BadRequestException('templateId는 1~64자여야 합니다.');
    }
    if (BUILTIN_LOCKED_TEMPLATE_IDS.includes(templateId)) {
      throw new BadRequestException('시스템 기본 양식 ID는 새 템플릿으로 사용할 수 없습니다.');
    }
    this.validateSectionPayload(dto);
    const conn = await this.pool.getConnection();
    try {
      const existing = await this.findTemplateById(conn, templateId);
      if (existing) {
        throw new BadRequestException('동일한 templateId가 이미 존재합니다.');
      }
      const json = JSON.stringify(dto.sections);
      const displayTitle =
        dto.displayTitle != null && String(dto.displayTitle).trim() !== ''
          ? String(dto.displayTitle).trim().slice(0, 128)
          : null;
      await conn.query(
        `INSERT INTO template_ui_configs (template_id, fields_json, display_title) VALUES (?, ?, ?)`,
        [templateId, json, displayTitle],
      );
      await conn.query('DELETE FROM template_ui_removed WHERE template_id = ?', [templateId]);
      return { ok: true, templateId };
    } finally {
      conn.release();
    }
  }

  async upsert(templateIdRaw: string, dto: UpdateTemplateUiDto): Promise<{ ok: true; templateId: string }> {
    const templateId = templateIdRaw.trim();
    if (!isValidTemplateId(templateId)) {
      throw new BadRequestException('templateId는 1~64자여야 합니다.');
    }
    if (BUILTIN_LOCKED_TEMPLATE_IDS.includes(templateId)) {
      throw new ForbiddenException('시스템 기본 양식은 수정할 수 없습니다.');
    }
    this.validateSectionPayload(dto);
    const conn = await this.pool.getConnection();
    try {
      const existing = await this.findTemplateById(conn, templateId);
      if (!existing) {
        if (!DEFAULT_TEMPLATE_IDS.includes(templateId)) {
          throw new BadRequestException(
            '존재하지 않는 템플릿입니다. 신규 템플릿은 JSON 추가 기능으로 생성해 주세요.',
          );
        }
        const displayTitle =
          dto.displayTitle != null && String(dto.displayTitle).trim() !== ''
            ? String(dto.displayTitle).trim().slice(0, 128)
            : null;
        await conn.query(
          `INSERT INTO template_ui_configs (template_id, fields_json, display_title) VALUES (?, ?, ?)`,
          [templateId, JSON.stringify(dto.sections), displayTitle],
        );
        await conn.query('DELETE FROM template_ui_removed WHERE template_id = ?', [templateId]);
        return { ok: true, templateId };
      }
      const json = JSON.stringify(dto.sections);
      if (dto.displayTitle !== undefined) {
        const displayTitle =
          dto.displayTitle != null && String(dto.displayTitle).trim() !== ''
            ? String(dto.displayTitle).trim().slice(0, 128)
            : null;
        await conn.query(
          `UPDATE template_ui_configs SET fields_json = ?, display_title = ?, updated_at = CURRENT_TIMESTAMP WHERE template_id = ?`,
          [json, displayTitle, templateId],
        );
      } else {
        await conn.query(
          `UPDATE template_ui_configs SET fields_json = ?, updated_at = CURRENT_TIMESTAMP WHERE template_id = ?`,
          [json, templateId],
        );
      }
      return { ok: true, templateId };
    } finally {
      conn.release();
    }
  }

  private affectedRows(result: unknown): number {
    if (result && typeof result === 'object' && 'affectedRows' in result) {
      return Number((result as { affectedRows: number }).affectedRows ?? 0);
    }
    return 0;
  }

  /**
   * 해당 record_type(records)과 template_ui_configs 행을 제거합니다.
   * records 테이블이 없으면 템플릿 행만 삭제합니다.
   */
  async deleteTemplate(templateIdRaw: string): Promise<{
    ok: true;
    templateId: string;
    deletedRecords: number;
    removedTemplateRow: boolean;
  }> {
    const templateId = templateIdRaw.trim();
    if (!isValidTemplateId(templateId)) {
      throw new BadRequestException('templateId는 1~64자여야 합니다.');
    }
    if (BUILTIN_LOCKED_TEMPLATE_IDS.includes(templateId)) {
      throw new ForbiddenException('시스템 기본 양식은 삭제할 수 없습니다.');
    }

    const conn = await this.pool.getConnection();
    try {
      let deletedRecords = 0;
      await conn.beginTransaction();
      try {
        const res = await conn.query('DELETE FROM records WHERE record_type = ?', [templateId]);
        deletedRecords = this.affectedRows(res);
      } catch (e: any) {
        await conn.rollback();
        if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
          throw e;
        }
        await conn.beginTransaction();
      }

      try {
        const tplRes = await conn.query('DELETE FROM template_ui_configs WHERE template_id = ?', [
          templateId,
        ]);
        await conn.query('INSERT IGNORE INTO template_ui_removed (template_id) VALUES (?)', [
          templateId,
        ]);
        const removedTemplateRow = this.affectedRows(tplRes) > 0;
        await conn.commit();
        return { ok: true, templateId, deletedRecords, removedTemplateRow };
      } catch (inner) {
        await conn.rollback();
        throw inner;
      }
    } finally {
      conn.release();
    }
  }

  async listPresets(): Promise<TemplateSectionPreset[]> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        'SELECT preset_id, category, title, sections_json FROM template_section_presets ORDER BY category ASC, preset_id ASC',
      )) as {
        preset_id: string;
        category: 'common' | 'patient' | 'extra';
        title: string;
        sections_json: string;
      }[];
      return rows
        .map((row) => {
          try {
            const parsed: unknown = JSON.parse(row.sections_json);
            const normalized = this.parseStoredSectionMap(parsed);
            if (!normalized) return null;
            return {
              presetId: row.preset_id,
              category: row.category,
              title: row.title,
              sections: normalized,
            } as TemplateSectionPreset;
          } catch {
            return null;
          }
        })
        .filter((preset): preset is TemplateSectionPreset => preset != null);
    } finally {
      conn.release();
    }
  }
}
