import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import { EXCEL_TEMPLATE_CATALOG } from './excel-template-catalog';
import type {
  TemplateCatalogForm,
  TemplateDetail,
  TemplateField,
  TemplateFieldCondition,
  TemplateFieldOption,
  TemplateListItem,
  TemplateSection,
} from './templates.types';
import { TEMPLATE_FIELD_TYPES } from './templates.types';
import type { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(@Inject(DB_POOL) private readonly pool: mariadb.Pool) {}

  async onModuleInit(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await this.ensureSchema(conn);
      await this.seedExcelCatalog(conn);
    } finally {
      conn.release();
    }
  }

  private async ensureSchema(conn: mariadb.PoolConnection): Promise<void> {
    await conn.query(
      `CREATE TABLE IF NOT EXISTS template_forms (
        template_id VARCHAR(96) NOT NULL PRIMARY KEY,
        title VARCHAR(128) NOT NULL,
        version INT NOT NULL DEFAULT 2,
        source_sheet VARCHAR(128) NOT NULL DEFAULT '',
        institution VARCHAR(64) NOT NULL DEFAULT '세브란스',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await conn.query(
      `CREATE TABLE IF NOT EXISTS template_sections (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(96) NOT NULL,
        section_key VARCHAR(96) NOT NULL,
        title VARCHAR(256) NOT NULL,
        display_order INT NOT NULL,
        repeatable BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE KEY ux_template_section (template_id, section_key),
        CONSTRAINT fk_template_sections_form
          FOREIGN KEY (template_id) REFERENCES template_forms(template_id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await conn.query(
      `CREATE TABLE IF NOT EXISTS template_fields (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(96) NOT NULL,
        section_key VARCHAR(96) NOT NULL,
        field_key VARCHAR(96) NOT NULL,
        label VARCHAR(256) NOT NULL,
        field_type VARCHAR(32) NOT NULL,
        description LONGTEXT NULL,
        ai_hint LONGTEXT NULL,
        input_sources_json LONGTEXT NOT NULL,
        source_row INT NOT NULL DEFAULT 0,
        source_definition LONGTEXT NULL,
        display_order INT NOT NULL,
        UNIQUE KEY ux_template_field (template_id, field_key),
        KEY ix_template_fields_section (template_id, section_key),
        CONSTRAINT fk_template_fields_form
          FOREIGN KEY (template_id) REFERENCES template_forms(template_id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await conn.query(
      `CREATE TABLE IF NOT EXISTS template_field_options (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(96) NOT NULL,
        field_key VARCHAR(96) NOT NULL,
        option_key VARCHAR(128) NOT NULL,
        label VARCHAR(128) NOT NULL,
        allow_free_text BOOLEAN NOT NULL DEFAULT FALSE,
        display_order INT NOT NULL,
        UNIQUE KEY ux_template_field_option (template_id, field_key, option_key),
        CONSTRAINT fk_template_options_field
          FOREIGN KEY (template_id, field_key) REFERENCES template_fields(template_id, field_key)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await conn.query(
      `CREATE TABLE IF NOT EXISTS template_field_conditions (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        template_id VARCHAR(96) NOT NULL,
        field_key VARCHAR(96) NOT NULL,
        condition_type VARCHAR(64) NOT NULL,
        trigger_field_key VARCHAR(96) NOT NULL,
        trigger_option_key VARCHAR(128) NOT NULL,
        target_field_key VARCHAR(96) NOT NULL,
        CONSTRAINT fk_template_conditions_field
          FOREIGN KEY (template_id, field_key) REFERENCES template_fields(template_id, field_key)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  }

  private async seedExcelCatalog(conn: mariadb.PoolConnection): Promise<void> {
    for (const form of EXCEL_TEMPLATE_CATALOG) {
      const prepared = this.prepareCatalogForm(form);
      const existing = await this.loadTemplateHeader(conn, form.templateId);
      const shouldRefreshExisting =
        existing && (await this.countFreeTextSentinelFields(conn, form.templateId)) > 0;
      if (existing && !shouldRefreshExisting) continue;
      await conn.beginTransaction();
      try {
        await this.replaceTemplate(conn, prepared, false);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    }
  }

  async list(): Promise<TemplateListItem[]> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        `SELECT f.template_id, f.title, f.version, f.source_sheet, f.institution, f.is_active,
                COUNT(DISTINCT s.section_key) AS section_count,
                COUNT(DISTINCT tf.field_key) AS field_count
         FROM template_forms f
         LEFT JOIN template_sections s ON s.template_id = f.template_id
         LEFT JOIN template_fields tf ON tf.template_id = f.template_id
         WHERE f.is_active = TRUE
         GROUP BY f.template_id, f.title, f.version, f.source_sheet, f.institution, f.is_active
         ORDER BY f.created_at ASC, f.template_id ASC`,
      )) as any[];
      return rows.map((row) => ({
        templateId: String(row.template_id),
        title: String(row.title),
        version: Number(row.version ?? 2),
        sourceSheet: String(row.source_sheet ?? ''),
        institution: String(row.institution ?? '세브란스'),
        isActive: Boolean(row.is_active),
        sectionCount: Number(row.section_count ?? 0),
        fieldCount: Number(row.field_count ?? 0),
      }));
    } finally {
      conn.release();
    }
  }

  async findOne(templateId: string): Promise<TemplateDetail> {
    const conn = await this.pool.getConnection();
    try {
      return await this.loadTemplateDetail(conn, templateId);
    } finally {
      conn.release();
    }
  }

  async update(templateId: string, dto: UpdateTemplateDto): Promise<TemplateDetail> {
    const conn = await this.pool.getConnection();
    try {
      const existing = await this.loadTemplateHeader(conn, templateId);
      if (!existing) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
      const next: TemplateCatalogForm = {
        templateId,
        title: String(dto.title ?? existing.title).trim().slice(0, 128) || existing.title,
        sourceSheet: existing.sourceSheet,
        institution: existing.institution,
        sections: this.normalizeSections(dto.sections as TemplateSection[]),
      };
      await conn.beginTransaction();
      try {
        await this.replaceTemplate(conn, next, true);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
      return await this.loadTemplateDetail(conn, templateId);
    } finally {
      conn.release();
    }
  }

  private async replaceTemplate(
    conn: mariadb.PoolConnection,
    form: TemplateCatalogForm,
    bumpVersion: boolean,
  ): Promise<void> {
    const normalized = {
      ...form,
      sections: this.normalizeSections(form.sections),
    };
    const header = await this.loadTemplateHeader(conn, normalized.templateId);
    const version = bumpVersion ? Number(header?.version ?? 2) + 1 : Number(header?.version ?? 2) || 2;
    await conn.query(
      `INSERT INTO template_forms (template_id, title, version, source_sheet, institution, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         version = ?,
         source_sheet = VALUES(source_sheet),
         institution = VALUES(institution),
         is_active = TRUE`,
      [
        normalized.templateId,
        normalized.title,
        version,
        normalized.sourceSheet,
        normalized.institution,
        version,
      ],
    );
    await conn.query('DELETE FROM template_fields WHERE template_id = ?', [
      normalized.templateId,
    ]);
    await conn.query('DELETE FROM template_sections WHERE template_id = ?', [
      normalized.templateId,
    ]);

    for (const section of normalized.sections) {
      await conn.query(
        `INSERT INTO template_sections
          (template_id, section_key, title, display_order, repeatable)
         VALUES (?, ?, ?, ?, ?)`,
        [
          normalized.templateId,
          section.sectionKey,
          section.title,
          section.displayOrder,
          section.repeatable,
        ],
      );
      for (const field of section.fields) {
        await conn.query(
          `INSERT INTO template_fields
            (template_id, section_key, field_key, label, field_type, description, ai_hint,
             input_sources_json, source_row, source_definition, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            normalized.templateId,
            section.sectionKey,
            field.fieldKey,
            field.label,
            field.type,
            field.description ?? '',
            field.aiHint ?? '',
            JSON.stringify(field.inputSources ?? []),
            field.sourceRow ?? 0,
            field.sourceDefinition ?? '',
            field.displayOrder,
          ],
        );
        for (const option of field.options ?? []) {
          await conn.query(
            `INSERT INTO template_field_options
              (template_id, field_key, option_key, label, allow_free_text, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              normalized.templateId,
              field.fieldKey,
              option.optionKey,
              option.label,
              option.allowFreeText,
              option.displayOrder,
            ],
          );
        }
        for (const condition of field.conditions ?? []) {
          await conn.query(
            `INSERT INTO template_field_conditions
              (template_id, field_key, condition_type, trigger_field_key, trigger_option_key, target_field_key)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              normalized.templateId,
              field.fieldKey,
              condition.conditionType,
              condition.triggerFieldKey,
              condition.triggerOptionKey,
              condition.targetFieldKey,
            ],
          );
        }
      }
    }
  }

  private normalizeSections(sections: TemplateSection[]): TemplateSection[] {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new BadRequestException('최소 1개 이상의 섹션이 필요합니다.');
    }
    const seenSections = new Set<string>();
    const seenFields = new Set<string>();
    const normalized = sections.map((section, sectionIndex) => {
      const sectionKey = this.safeKey(section.sectionKey, `section-${sectionIndex + 1}`);
      if (seenSections.has(sectionKey)) {
        throw new BadRequestException(`섹션 키가 중복되었습니다: ${sectionKey}`);
      }
      seenSections.add(sectionKey);
      const fields = (section.fields ?? []).map((field, fieldIndex) => {
        const fieldKey = this.safeKey(field.fieldKey, `${sectionKey}-field-${fieldIndex + 1}`);
        if (seenFields.has(fieldKey)) {
          throw new BadRequestException(`필드 키가 중복되었습니다: ${fieldKey}`);
        }
        seenFields.add(fieldKey);
        const type = TEMPLATE_FIELD_TYPES.includes(field.type) ? field.type : 'text_long';
        return {
          ...field,
          fieldKey,
          label: String(field.label ?? fieldKey).trim().slice(0, 256) || fieldKey,
          type,
          description: String(field.description ?? ''),
          aiHint: String(field.aiHint ?? ''),
          inputSources: Array.isArray(field.inputSources) ? field.inputSources.map(String) : [],
          sourceRow: Number(field.sourceRow ?? 0),
          sourceDefinition: String(field.sourceDefinition ?? ''),
          displayOrder: Number(field.displayOrder ?? fieldIndex + 1),
          options: this.normalizeOptions(field.options ?? []),
          conditions: this.normalizeConditions(field.conditions ?? [], fieldKey),
        };
      });
      return {
        sectionKey,
        title: String(section.title ?? sectionKey).trim().slice(0, 256) || sectionKey,
        displayOrder: Number(section.displayOrder ?? sectionIndex + 1),
        repeatable: Boolean(section.repeatable),
        fields,
      };
    }).filter((section) => section.fields.length > 0);
    if (normalized.length === 0) {
      throw new BadRequestException('최소 1개 이상의 필드가 필요합니다.');
    }
    return normalized;
  }

  private prepareCatalogForm(form: TemplateCatalogForm): TemplateCatalogForm {
    return {
      ...form,
      sections: form.sections.map((section) => {
        const fields: TemplateField[] = [];
        for (const field of section.fields) {
          if (this.isFreeTextSentinel(field) && fields.length > 0) {
            const previous = fields[fields.length - 1];
            const triggerOptions = this.extractFreeTextTriggerOptions(previous);
            if (triggerOptions.length > 0) {
              const triggerSet = new Set(triggerOptions);
              previous.options = previous.options.map((option) =>
                triggerSet.has(option.optionKey)
                  ? { ...option, allowFreeText: true }
                  : option,
              );
              const existingConditions = new Set(
                previous.conditions.map((condition) => condition.triggerOptionKey),
              );
              previous.conditions = [
                ...previous.conditions,
                ...triggerOptions
                  .filter((optionKey) => !existingConditions.has(optionKey))
                  .map((optionKey) => ({
                    conditionType: 'free_text_when_option' as const,
                    triggerFieldKey: previous.fieldKey,
                    triggerOptionKey: optionKey,
                    targetFieldKey: `${previous.fieldKey}_free_text`,
                  })),
              ];
              continue;
            }
            fields.push({
              ...field,
              label: '자유서술',
              options: [],
              conditions: [],
            });
            continue;
          }
          fields.push({
            ...field,
            options: (field.options ?? []).map((option) => ({ ...option })),
            conditions: (field.conditions ?? []).map((condition) => ({ ...condition })),
          });
        }
        return {
          ...section,
          fields: fields.map((field, index) => ({
            ...field,
            displayOrder: index + 1,
          })),
        };
      }),
    };
  }

  private isFreeTextSentinel(field: TemplateField): boolean {
    return (
      field.label.trim().toLowerCase() === 'yes' &&
      field.sourceDefinition.includes('자유서술형 입력 가능')
    );
  }

  private extractFreeTextTriggerOptions(field: TemplateField): string[] {
    if (!field.options?.length) return [];
    const definition = `${field.sourceDefinition} ${field.aiHint}`;
    const match = definition.match(/if\s+(.+?)\s*(?:==|=)/i);
    const optionKeys = new Set(field.options.map((option) => option.optionKey));
    if (match?.[1]) {
      const candidates = match[1]
        .split(/\s+(?:or|또는)\s+/i)
        .map((value) => value.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, ''))
        .filter(Boolean)
        .filter((value) => optionKeys.has(value));
      if (candidates.length > 0) return candidates;
    }
    const fallback = ['기타', '상세부위'].filter((value) => optionKeys.has(value));
    return fallback.length > 0 ? fallback : [];
  }

  private normalizeOptions(options: TemplateFieldOption[]): TemplateFieldOption[] {
    const seen = new Set<string>();
    return options.map((option, index) => {
      const optionKey = String(option.optionKey ?? '').trim();
      if (!optionKey) throw new BadRequestException('선택지 키는 비어 있을 수 없습니다.');
      if (seen.has(optionKey)) throw new BadRequestException(`선택지 키가 중복되었습니다: ${optionKey}`);
      seen.add(optionKey);
      return {
        optionKey,
        label: String(option.label ?? optionKey).trim().slice(0, 128) || optionKey,
        allowFreeText: Boolean(option.allowFreeText),
        displayOrder: Number(option.displayOrder ?? index + 1),
      };
    });
  }

  private normalizeConditions(
    conditions: TemplateFieldCondition[],
    fieldKey: string,
  ): TemplateFieldCondition[] {
    return conditions.map((condition) => ({
      conditionType: 'free_text_when_option',
      triggerFieldKey: String(condition.triggerFieldKey ?? fieldKey),
      triggerOptionKey: String(condition.triggerOptionKey ?? ''),
      targetFieldKey: String(condition.targetFieldKey ?? `${fieldKey}_free_text`),
    }));
  }

  private safeKey(raw: string, fallback: string): string {
    const key = String(raw ?? '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 96);
    return key || fallback;
  }

  private async loadTemplateHeader(
    conn: mariadb.PoolConnection,
    templateId: string,
  ): Promise<Omit<TemplateListItem, 'sectionCount' | 'fieldCount'> | null> {
    const rows = (await conn.query(
      `SELECT template_id, title, version, source_sheet, institution, is_active
       FROM template_forms WHERE template_id = ? LIMIT 1`,
      [templateId],
    )) as any[];
    const row = rows[0];
    if (!row) return null;
    return {
      templateId: String(row.template_id),
      title: String(row.title),
      version: Number(row.version ?? 2),
      sourceSheet: String(row.source_sheet ?? ''),
      institution: String(row.institution ?? '세브란스'),
      isActive: Boolean(row.is_active),
    };
  }

  private async countFreeTextSentinelFields(
    conn: mariadb.PoolConnection,
    templateId: string,
  ): Promise<number> {
    const rows = (await conn.query(
      `SELECT COUNT(*) AS count
       FROM template_fields
       WHERE template_id = ?
         AND LOWER(label) = 'yes'
         AND source_definition LIKE '%자유서술형 입력 가능%'`,
      [templateId],
    )) as any[];
    return Number(rows[0]?.count ?? 0);
  }

  private async loadTemplateDetail(
    conn: mariadb.PoolConnection,
    templateId: string,
  ): Promise<TemplateDetail> {
    const header = await this.loadTemplateHeader(conn, templateId);
    if (!header || !header.isActive) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    const sectionRows = (await conn.query(
      `SELECT section_key, title, display_order, repeatable
       FROM template_sections
       WHERE template_id = ?
       ORDER BY display_order ASC, id ASC`,
      [templateId],
    )) as any[];
    const fieldRows = (await conn.query(
      `SELECT section_key, field_key, label, field_type, description, ai_hint,
              input_sources_json, source_row, source_definition, display_order
       FROM template_fields
       WHERE template_id = ?
       ORDER BY section_key ASC, display_order ASC, id ASC`,
      [templateId],
    )) as any[];
    const optionRows = (await conn.query(
      `SELECT field_key, option_key, label, allow_free_text, display_order
       FROM template_field_options
       WHERE template_id = ?
       ORDER BY display_order ASC, id ASC`,
      [templateId],
    )) as any[];
    const conditionRows = (await conn.query(
      `SELECT field_key, condition_type, trigger_field_key, trigger_option_key, target_field_key
       FROM template_field_conditions
       WHERE template_id = ?
       ORDER BY id ASC`,
      [templateId],
    )) as any[];
    const optionsByField = new Map<string, TemplateFieldOption[]>();
    for (const row of optionRows) {
      const key = String(row.field_key);
      const list = optionsByField.get(key) ?? [];
      list.push({
        optionKey: String(row.option_key),
        label: String(row.label),
        allowFreeText: Boolean(row.allow_free_text),
        displayOrder: Number(row.display_order ?? list.length + 1),
      });
      optionsByField.set(key, list);
    }
    const conditionsByField = new Map<string, TemplateFieldCondition[]>();
    for (const row of conditionRows) {
      const key = String(row.field_key);
      const list = conditionsByField.get(key) ?? [];
      list.push({
        conditionType: 'free_text_when_option',
        triggerFieldKey: String(row.trigger_field_key),
        triggerOptionKey: String(row.trigger_option_key),
        targetFieldKey: String(row.target_field_key),
      });
      conditionsByField.set(key, list);
    }
    const fieldsBySection = new Map<string, TemplateField[]>();
    for (const row of fieldRows) {
      const sectionKey = String(row.section_key);
      const fieldKey = String(row.field_key);
      const list = fieldsBySection.get(sectionKey) ?? [];
      list.push({
        fieldKey,
        label: String(row.label),
        type: TEMPLATE_FIELD_TYPES.includes(row.field_type) ? row.field_type : 'text_long',
        description: String(row.description ?? ''),
        aiHint: String(row.ai_hint ?? ''),
        inputSources: this.parseJsonStringArray(row.input_sources_json),
        sourceRow: Number(row.source_row ?? 0),
        sourceDefinition: String(row.source_definition ?? ''),
        displayOrder: Number(row.display_order ?? list.length + 1),
        options: optionsByField.get(fieldKey) ?? [],
        conditions: conditionsByField.get(fieldKey) ?? [],
      });
      fieldsBySection.set(sectionKey, list);
    }
    const sections: TemplateSection[] = sectionRows.map((row) => {
      const sectionKey = String(row.section_key);
      return {
        sectionKey,
        title: String(row.title),
        displayOrder: Number(row.display_order ?? 0),
        repeatable: Boolean(row.repeatable),
        fields: fieldsBySection.get(sectionKey) ?? [],
      };
    });
    return {
      ...header,
      sectionCount: sections.length,
      fieldCount: sections.reduce((sum, section) => sum + section.fields.length, 0),
      sections,
    };
  }

  private parseJsonStringArray(raw: unknown): string[] {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
}
