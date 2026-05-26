import {
  Injectable,
  Inject,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Pool } from 'mariadb';
import { DB_POOL } from '../database/database.module';
import { CreateRecordDto, UpdateRecordDto } from './dto/create-record.dto';
import { UsersService } from '../users/users.service';
import type { AppRole } from '../auth/roles.decorator';

@Injectable()
export class RecordsService implements OnModuleInit {
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      try {
        const constraints = (await conn.query(
          `SELECT CONSTRAINT_NAME
           FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'records'
             AND COLUMN_NAME = 'patient_id'
             AND REFERENCED_TABLE_NAME IS NOT NULL`,
        )) as Array<{ CONSTRAINT_NAME: string }>;
        for (const row of constraints) {
          const name = String(row.CONSTRAINT_NAME).replace(/`/g, '``');
          await conn.query(`ALTER TABLE records DROP FOREIGN KEY \`${name}\``);
        }
      } catch (e: any) {
        this.logger.warn(`records.patient_id FK 제거 스킵: ${e?.message ?? e}`);
      }
      try {
        await conn.query(`ALTER TABLE records MODIFY COLUMN patient_id BIGINT NULL COMMENT '레거시 환자 FK'`);
      } catch (e: any) {
        if (e?.code !== 'ER_BAD_FIELD_ERROR' && e?.errno !== 1054) {
          this.logger.warn(`records.patient_id nullable 마이그레이션 스킵: ${e?.message ?? e}`);
        }
      }
      await conn.query(
        `ALTER TABLE records
         ADD COLUMN IF NOT EXISTS title VARCHAR(512) NOT NULL DEFAULT '' COMMENT '사용자 지정 기록 제목'`,
      );
      try {
        await conn.query(
          `ALTER TABLE records
           MODIFY COLUMN creation_source ENUM('manual','voice','ai','ocr','record_based') NOT NULL DEFAULT 'manual'
           COMMENT '생성 경로: 직접/음성/AI/OCR/기록기반'`,
        );
      } catch (e: any) {
        if (e?.code !== 'ER_BAD_FIELD_ERROR' && e?.errno !== 1054) {
          this.logger.warn(`records.creation_source 마이그레이션 스킵: ${e?.message ?? e}`);
        }
      }
      await conn.query(
        `UPDATE records r
         SET r.title = CONCAT(
           r.record_type,
           '-',
           DATE_FORMAT(r.record_date, '%Y.%m.%d'),
           ' ',
           DATE_FORMAT(r.record_time, '%H:%i')
         )
         WHERE r.title IS NULL OR r.title = ''`,
      );
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
        return;
      }
      this.logger.warn(`records.title 마이그레이션 스킵: ${e?.message ?? e}`);
    } finally {
      conn.release();
    }
  }

  async findPaged(params: {
    page: number;
    pageSize: number;
    sort: string;
    search: string;
  }) {
    const conn = await this.pool.getConnection();
    try {
      const page = Math.max(1, params.page);
      const pageSize = Math.min(100, Math.max(1, params.pageSize));
      const offset = (page - 1) * pageSize;
      const orderBy = this.buildOrderBy(params.sort);
      const keyword = params.search.trim();
      const whereSql = keyword
        ? `WHERE (
             r.document_number LIKE ?
             OR r.record_type LIKE ?
             OR r.title LIKE ?
           )`
        : '';
      const whereArgs = keyword
        ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        : [];

      let total = 0;
      try {
        const [{ total: totalRaw }] = await conn.query(
          `SELECT COUNT(*) AS total
           FROM records r
           ${whereSql}`,
          whereArgs,
        );
        total = Number(totalRaw ?? 0);
      } catch (e: any) {
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          return { total: 0, items: [] };
        }
        throw e;
      }
      try {
        const rows = await conn.query(
          `SELECT r.id, r.record_type, r.title, r.document_number,
                  r.record_date, r.record_time, r.emr_sync_status, r.creation_source
           FROM records r
           ${whereSql}
           ORDER BY ${orderBy}
           LIMIT ? OFFSET ?`,
          [...whereArgs, pageSize, offset],
        );
        return {
          total,
          items: (rows as any[]).map((row) => this.mapRecordListItemRow(row)),
        };
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          const rows = await conn.query(
            `SELECT r.id, r.record_type, r.document_number,
                    r.record_date, r.record_time, r.emr_sync_status
             FROM records r
             ${whereSql}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...whereArgs, pageSize, offset],
          );
          return {
            total,
            items: (rows as any[]).map((row) =>
              this.mapRecordListItemRow({ ...row, creation_source: 'manual' }),
            ),
          };
        }
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          return { total: 0, items: [] };
        }
        throw e;
      }
    } finally {
      conn.release();
    }
  }

  async findOne(id: number) {
    const conn = await this.pool.getConnection();
    try {
      let rows: any[];
      try {
        rows = await conn.query(
          `SELECT r.id, r.record_type, r.title, r.document_number,
                  r.record_date, r.record_time, r.data, r.creation_source, r.emr_sync_status
           FROM records r
           WHERE r.id = ?`,
          [id],
        );
      } catch (e: any) {
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          throw new NotFoundException('기록을 찾을 수 없습니다.');
        }
        throw e;
      }
      if (!rows?.length) {
        throw new NotFoundException('기록을 찾을 수 없습니다.');
      }
      const row = rows[0];
      const data =
        typeof row.data === 'string' ? JSON.parse(row.data) : row.data ?? {};
      const emr = row.emr_sync_status === 'sent' ? 'sent' : 'pending';
      const source = this.normalizeCreationSource(row.creation_source);
      const rd = row.record_date;
      const recordDateStr =
        rd instanceof Date
          ? rd.toISOString().slice(0, 10)
          : String(rd ?? '').slice(0, 10);
      const rt = row.record_time;
      const recordTimeStr =
        typeof rt === 'string'
          ? rt.slice(0, 8)
          : rt instanceof Date
            ? rt.toTimeString().slice(0, 8)
            : String(rt ?? '').slice(0, 8);
      const titleRaw = row.title != null ? String(row.title).trim() : '';
      const titleResolved =
        titleRaw !== '' ? titleRaw : this.defaultTitleFromRow(row);
      return {
        id: Number(row.id),
        recordType: String(row.record_type),
        title: titleResolved,
        documentNumber: String(row.document_number),
        recordDate: recordDateStr,
        recordTime: recordTimeStr,
        data,
        creationSource: source,
        emrSyncStatus: emr,
      };
    } finally {
      conn.release();
    }
  }

  async create(dto: CreateRecordDto) {
    const conn = await this.pool.getConnection();
    try {
      const title = String(dto.title ?? '').trim().slice(0, 512);
      if (!title) {
        throw new BadRequestException('기록 제목(title)은 비울 수 없습니다.');
      }
      const raw = dto.data != null && typeof dto.data === 'object' ? dto.data : {};
      const dataJson = JSON.stringify(raw);
      const source = dto.creationSource ?? 'manual';
      let result: any;
      try {
        result = await conn.query(
          `INSERT INTO records
            (record_type, document_number, record_date, record_time, title, data, creation_source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            dto.recordType,
            dto.documentNumber,
            dto.recordDate,
            dto.recordTime,
            title,
            dataJson,
            source,
          ],
        );
      } catch (first: any) {
        if (first?.code === 'ER_BAD_FIELD_ERROR' || first?.errno === 1054) {
          result = await conn.query(
            `INSERT INTO records
              (record_type, document_number, record_date, record_time, data, creation_source)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              dto.recordType,
              dto.documentNumber,
              dto.recordDate,
              dto.recordTime,
              dataJson,
              source,
            ],
          );
        } else {
          throw first;
        }
      }
      return { id: Number(result.insertId), message: '기록이 저장되었습니다.' };
    } catch (err: any) {
      if (err?.code === 'ER_NO_SUCH_TABLE' && err?.message?.includes('records')) {
        throw new InternalServerErrorException(
          'records 테이블이 없습니다. DB에 통합 기록 테이블을 생성한 뒤 다시 시도해 주세요.',
        );
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async update(id: number, dto: UpdateRecordDto) {
    const conn = await this.pool.getConnection();
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      if (dto.documentNumber !== undefined) {
        updates.push('document_number = ?');
        values.push(dto.documentNumber);
      }
      if (dto.recordDate !== undefined) {
        updates.push('record_date = ?');
        values.push(dto.recordDate);
      }
      if (dto.recordTime !== undefined) {
        updates.push('record_time = ?');
        values.push(dto.recordTime);
      }
      if (dto.title !== undefined) {
        const t = String(dto.title).trim().slice(0, 512);
        if (!t) {
          throw new BadRequestException('기록 제목은 비울 수 없습니다.');
        }
        updates.push('title = ?');
        values.push(t);
      }
      if (dto.data !== undefined) {
        updates.push('data = ?');
        values.push(JSON.stringify(dto.data));
      }
      if (updates.length === 0) {
        return { message: '변경 사항이 없습니다.' };
      }
      values.push(id);
      await conn.query(
        `UPDATE records SET ${updates.join(', ')} WHERE id = ?`,
        values,
      );
      return { message: '기록이 수정되었습니다.' };
    } finally {
      conn.release();
    }
  }

  async remove(id: number) {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(`DELETE FROM records WHERE id = ?`, [id]);
      return { message: '기록이 삭제되었습니다.' };
    } finally {
      conn.release();
    }
  }

  async updateEmrStatus(
    actor: { userId: number; role: AppRole },
    id: number,
    emrSyncStatus: 'pending' | 'sent',
  ) {
    // 정책: admin은 항상 가능, 일반 user는 verified 일 때만 가능
    if (actor.role !== 'admin') {
      const u = await this.usersService.findById(actor.userId);
      if (!u) throw new ForbiddenException('인증 정보가 유효하지 않습니다.');
      if (u.verificationStatus !== 'verified') {
        throw new ForbiddenException(
          '계정 인증이 완료된 경우에만 EMR 전송이 가능합니다.',
        );
      }
    }
    const conn = await this.pool.getConnection();
    try {
      try {
        await conn.query(`UPDATE records SET emr_sync_status = ? WHERE id = ?`, [
          emrSyncStatus,
          id,
        ]);
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          throw new BadRequestException(
            'records.emr_sync_status 컬럼이 없습니다. DB 스키마를 최신으로 반영해 주세요.',
          );
        }
        throw e;
      }
      return { message: 'EMR 전송 상태가 변경되었습니다.' };
    } finally {
      conn.release();
    }
  }

  /** 대시보드: 최근 생성 기록 (최신 생성 순) */
  async findRecentCreated(limit: number) {
    const conn = await this.pool.getConnection();
    try {
      const lim = Math.min(50, Math.max(1, limit));
      try {
        const rows = await conn.query(
          `SELECT r.id, r.record_type, r.title, r.document_number,
                  r.record_date, r.record_time, r.emr_sync_status, r.created_at
           FROM records r
           ORDER BY r.created_at DESC
           LIMIT ?`,
          [lim],
        );
        return (rows as any[]).map((row) => this.mapDashboardRecordRow(row));
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          const rows = await conn.query(
            `SELECT r.id, r.record_type, r.document_number,
                    r.record_date, r.record_time, r.created_at
             FROM records r
             ORDER BY r.created_at DESC
             LIMIT ?`,
            [lim],
          );
          return (rows as any[]).map((row) =>
            this.mapDashboardRecordRow({ ...row, emr_sync_status: 'pending' }),
          );
        }
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          return [];
        }
        throw e;
      }
    } finally {
      conn.release();
    }
  }

  /** 대시보드: 최근 수정 기록 (생성 직후가 아닌 실제 수정만) */
  async findRecentUpdated(limit: number) {
    const conn = await this.pool.getConnection();
    try {
      const lim = Math.min(50, Math.max(1, limit));
      try {
        const rows = await conn.query(
          `SELECT r.id, r.record_type, r.title, r.document_number,
                  r.record_date, r.record_time, r.emr_sync_status, r.updated_at
           FROM records r
           WHERE r.updated_at > r.created_at
           ORDER BY r.updated_at DESC
           LIMIT ?`,
          [lim],
        );
        return (rows as any[]).map((row) => this.mapDashboardRecordRow(row));
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          const rows = await conn.query(
            `SELECT r.id, r.record_type, r.document_number,
                    r.record_date, r.record_time, r.updated_at
             FROM records r
             WHERE r.updated_at > r.created_at
             ORDER BY r.updated_at DESC
             LIMIT ?`,
            [lim],
          );
          return (rows as any[]).map((row) =>
            this.mapDashboardRecordRow({ ...row, emr_sync_status: 'pending' }),
          );
        }
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          return [];
        }
        throw e;
      }
    } finally {
      conn.release();
    }
  }

  async getStats() {
    const conn = await this.pool.getConnection();
    try {
      const defaultStats = {
        totalRecords: 0,
        todayVoiceRecords: 0,
        voiceRecordsDodChange: 0,
        todayRecordBasedRecords: 0,
        recordBasedRecordsDodChange: 0,
        todayOcrRecords: 0,
        ocrRecordsDodChange: 0,
        pendingEmrRecords: 0,
        sentEmrRecords: 0,
      };
      try {
        const [{ total }] = await conn.query(`SELECT COUNT(*) AS total FROM records`);
        const [{ tv }] = await conn.query(
          `SELECT COUNT(*) AS tv FROM records
           WHERE creation_source = 'voice' AND DATE(created_at) = CURDATE()`,
        );
        const [{ yv }] = await conn.query(
          `SELECT COUNT(*) AS yv FROM records
           WHERE creation_source = 'voice' AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
        );
        const [{ tr }] = await conn.query(
          `SELECT COUNT(*) AS tr FROM records
           WHERE creation_source = 'record_based' AND DATE(created_at) = CURDATE()`,
        );
        const [{ yr }] = await conn.query(
          `SELECT COUNT(*) AS yr FROM records
           WHERE creation_source = 'record_based' AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
        );
        const [{ tocr }] = await conn.query(
          `SELECT COUNT(*) AS tocr FROM records
           WHERE creation_source = 'ocr' AND DATE(created_at) = CURDATE()`,
        );
        const [{ yocr }] = await conn.query(
          `SELECT COUNT(*) AS yocr FROM records
           WHERE creation_source = 'ocr' AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
        );
        const [{ pending }] = await conn.query(
          `SELECT COUNT(*) AS pending FROM records WHERE emr_sync_status <> 'sent' OR emr_sync_status IS NULL`,
        );
        const [{ sent }] = await conn.query(
          `SELECT COUNT(*) AS sent FROM records WHERE emr_sync_status = 'sent'`,
        );
        return {
          totalRecords: Number(total ?? 0),
          todayVoiceRecords: Number(tv ?? 0),
          voiceRecordsDodChange: Number(tv ?? 0) - Number(yv ?? 0),
          todayRecordBasedRecords: Number(tr ?? 0),
          recordBasedRecordsDodChange: Number(tr ?? 0) - Number(yr ?? 0),
          todayOcrRecords: Number(tocr ?? 0),
          ocrRecordsDodChange: Number(tocr ?? 0) - Number(yocr ?? 0),
          pendingEmrRecords: Number(pending ?? 0),
          sentEmrRecords: Number(sent ?? 0),
        };
      } catch (e: any) {
        if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
          return defaultStats;
        }
        throw e;
      }
    } finally {
      conn.release();
    }
  }

  private defaultTitleFromRow(row: any): string {
    const type = String(row.record_type ?? '');
    const dt = this.formatRecordDateTime(row.record_date, row.record_time);
    return `${type}-${dt}`;
  }

  private mapDashboardRecordRow(row: any) {
    const emr =
      row.emr_sync_status === 'sent' ? 'sent' : 'pending';
    const titleRaw = row.title != null ? String(row.title).trim() : '';
    const title =
      titleRaw !== '' ? titleRaw : this.defaultTitleFromRow(row);
    return {
      id: Number(row.id),
      recordType: String(row.record_type),
      title,
      documentNumber: String(row.document_number),
      recordDateTime: this.formatRecordDateTime(row.record_date, row.record_time),
      emrSyncStatus: emr,
      clientRecordId: this.toClientRecordId(
        String(row.record_type),
        Number(row.id),
      ),
    };
  }

  private normalizeCreationSource(raw: string | null | undefined): string {
    if (raw === 'voice' || raw === 'ai' || raw === 'ocr' || raw === 'record_based') {
      return raw;
    }
    return 'manual';
  }

  private mapRecordListItemRow(row: any) {
    const emr = row.emr_sync_status === 'sent' ? 'sent' : 'pending';
    const source = this.normalizeCreationSource(row.creation_source);
    const titleRaw = row.title != null ? String(row.title).trim() : '';
    const title =
      titleRaw !== '' ? titleRaw : this.defaultTitleFromRow(row);
    return {
      id: Number(row.id),
      recordType: String(row.record_type),
      title,
      documentNumber: String(row.document_number),
      recordDateTime: this.formatRecordDateTime(row.record_date, row.record_time),
      emrSyncStatus: emr,
      creationSource: source,
      clientRecordId: this.toClientRecordId(
        String(row.record_type),
        Number(row.id),
      ),
    };
  }

  private buildOrderBy(sort: string): string {
    const sortMap: Record<string, string> = {
      record_date_desc: 'r.record_date DESC, r.record_time DESC, r.id DESC',
      record_date_asc: 'r.record_date ASC, r.record_time ASC, r.id ASC',
      created_desc: 'r.created_at DESC, r.id DESC',
      updated_desc: 'r.updated_at DESC, r.id DESC',
      document_number_asc: 'r.document_number ASC, r.id DESC',
    };
    return sortMap[sort] ?? sortMap.record_date_desc;
  }

  private toClientRecordId(recordType: string, id: number): string {
    const prefix =
      recordType === '간호기록지'
        ? 'nursing-'
        : recordType === '간호인계기록지'
          ? 'handover-'
          : recordType === 'SOAP'
            ? 'soap-'
            : recordType === 'SOAPIE'
              ? 'soapie-'
              : recordType === 'SBAR'
                ? 'sbar-'
                : 'observation-';
    return `${prefix}${id}`;
  }

  private formatRecordDateTime(
    recordDate: Date | string,
    recordTime: string,
  ): string {
    const d = new Date(recordDate);
    const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
    const t = String(recordTime ?? '').slice(0, 5);
    return `${dateStr} ${t}`;
  }
}
