import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'mariadb';
import { DB_POOL } from '../database/database.module';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

/**
 * 환자 서비스
 *
 * NestJS의 핵심 패턴: Controller → Service → DB
 * - Controller는 HTTP 요청/응답만 담당
 * - Service는 실제 비즈니스 로직(DB 조회, 변환)을 담당
 * - 이렇게 분리하면 테스트와 재사용이 쉬워짐
 */
@Injectable()
export class PatientsService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /** 활성 환자 목록 조회 (프론트엔드 Patient 형태로 변환) */
  async findAll() {
    const conn = await this.pool.getConnection();
    try {
      const rows = await conn.query(
        `SELECT id, patient_number, name, birth_date, gender,
                room_number, diagnosis, admission_date, is_active,
                attending_doctor
         FROM patients
         WHERE is_active = TRUE
         ORDER BY admission_date DESC`,
      );

      return rows.map((row) => ({
        id: String(row.id),
        patientNumber: row.patient_number,
        roomNumber: row.room_number,
        name: row.name,
        birthDate: this.formatDate(row.birth_date),
        gender: row.gender,
        hasRecords: false,
        diagnosis: row.diagnosis,
        attendingDoctor: row.attending_doctor,
      }));
    } finally {
      conn.release();
    }
  }

  /** 환자 상세 조회 (프론트엔드 PatientDetailInfo 형태로 변환) */
  async findOne(id: number) {
    const conn = await this.pool.getConnection();
    try {
      const rows = await conn.query(
        `SELECT * FROM patients WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) {
        throw new NotFoundException('환자를 찾을 수 없습니다.');
      }

      const row = rows[0];
      return {
        diagnosis: row.diagnosis,
        age: this.calculateAge(row.birth_date),
        gender: row.gender === '여' ? '여성' : '남성',
        admissionDate: this.formatDate(row.admission_date),
        roomNumber: row.room_number,
        attendingDoctor: row.attending_doctor,
        allergies: row.allergies,
        bloodType: row.blood_type,
        insurance: row.insurance,
        emergencyContact: row.emergency_contact,
      };
    } finally {
      conn.release();
    }
  }

  /** 환자 등록 */
  async create(dto: CreatePatientDto) {
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.query(
        `INSERT INTO patients
          (patient_number, name, birth_date, gender, room_number,
           diagnosis, admission_date, attending_doctor,
           allergies, blood_type, insurance, emergency_contact)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.patientNumber, dto.name, dto.birthDate, dto.gender,
          dto.roomNumber, dto.diagnosis, dto.admissionDate,
          dto.attendingDoctor, dto.allergies || '없음',
          dto.bloodType, dto.insurance, dto.emergencyContact,
        ],
      );

      return { id: Number(result.insertId), message: '환자가 등록되었습니다.' };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('이미 존재하는 환자번호입니다.');
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  /** 환자 정보 수정 */
  async update(id: number, dto: UpdatePatientDto) {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `UPDATE patients SET
          name = COALESCE(?, name),
          room_number = COALESCE(?, room_number),
          diagnosis = COALESCE(?, diagnosis),
          attending_doctor = COALESCE(?, attending_doctor),
          allergies = COALESCE(?, allergies),
          blood_type = COALESCE(?, blood_type),
          insurance = COALESCE(?, insurance),
          emergency_contact = COALESCE(?, emergency_contact)
         WHERE id = ?`,
        [
          dto.name, dto.roomNumber, dto.diagnosis,
          dto.attendingDoctor, dto.allergies, dto.bloodType,
          dto.insurance, dto.emergencyContact, id,
        ],
      );

      return { message: '환자 정보가 수정되었습니다.' };
    } finally {
      conn.release();
    }
  }

  /** 퇴원 처리 (비활성화 + 퇴원 시각 기록 — 전월 대비 재원 환자 수 계산용) */
  async discharge(id: number) {
    const conn = await this.pool.getConnection();
    try {
      try {
        await conn.query(
          `UPDATE patients SET is_active = FALSE, discharged_at = COALESCE(discharged_at, NOW()) WHERE id = ?`,
          [id],
        );
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          await conn.query(
            `UPDATE patients SET is_active = FALSE WHERE id = ?`,
            [id],
          );
        } else {
          throw e;
        }
      }
      return { message: '퇴원 처리되었습니다.' };
    } finally {
      conn.release();
    }
  }

  /** 환자별 통합 기록 조회 (records 테이블). 테이블 없으면 [] 반환 */
  async findRecords(patientId: number) {
    const conn = await this.pool.getConnection();
    try {
      let rows: any[] = [];
      try {
        rows = await conn.query(
          `SELECT r.id, r.record_type, r.title, r.document_number, r.record_date, r.record_time, r.data,
                  p.name AS patient_name
           FROM records r
           INNER JOIN patients p ON p.id = r.patient_id
           WHERE r.patient_id = ?
           ORDER BY r.record_date DESC, r.record_time DESC`,
          [patientId],
        );
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
          try {
            rows = await conn.query(
              `SELECT r.id, r.record_type, r.document_number, r.record_date, r.record_time, r.data,
                      p.name AS patient_name
               FROM records r
               INNER JOIN patients p ON p.id = r.patient_id
               WHERE r.patient_id = ?
               ORDER BY r.record_date DESC, r.record_time DESC`,
              [patientId],
            );
          } catch {
            return [];
          }
        } else {
          return [];
        }
      }

      return rows.map((r: any) => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data ?? {};
        const prefix =
          r.record_type === '간호기록지'
            ? 'nursing-'
            : r.record_type === '간호인계기록지'
              ? 'handover-'
              : r.record_type === 'SOAP'
                ? 'soap-'
                : r.record_type === 'SOAPIE'
                  ? 'soapie-'
                  : r.record_type === 'SBAR'
                    ? 'sbar-'
                    : 'observation-';
        const titleRaw = r.title != null ? String(r.title).trim() : '';
        const patientName = String(r.patient_name ?? '');
        const title =
          titleRaw !== ''
            ? titleRaw
            : this.defaultRecordListTitle(
                patientName,
                String(r.record_type ?? ''),
                r.record_date,
                r.record_time,
              );
        return {
          id: `${prefix}${r.id}`,
          date: this.formatDate(r.record_date),
          time: this.formatTime(r.record_time),
          documentNumber: r.document_number,
          category: r.record_type,
          title,
          soapie: this.buildSoapieFromData(r.record_type, data, r.record_date, r.record_time),
          checked: false,
        };
      });
    } finally {
      conn.release();
    }
  }

  /** records.title 비었을 때 목록용 기본 제목 (환자명-분류-일시) */
  private defaultRecordListTitle(
    patientName: string,
    recordType: string,
    recordDate: Date | string,
    recordTime: string | Date,
  ): string {
    const name =
      String(patientName ?? '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim() || '—';
    const d = new Date(recordDate);
    const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
    const t = String(recordTime ?? '').slice(0, 5);
    return `${name}-${recordType}-${dateStr} ${t}`;
  }

  /** 대시보드 통계 조회 */
  async getStats() {
    const conn = await this.pool.getConnection();
    try {
      const [{ total }] = await conn.query(
        `SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE`,
      );
      const totalPatients = Number(total);

      /** 전월 말 시점 재원 환자 수 (입원일 ≤ 전월 말이고, 그 시점 아직 퇴원 전) */
      let totalPatientsPrevMonthEnd = totalPatients;
      try {
        const [{ c }] = await conn.query(
          `SELECT COUNT(*) AS c FROM patients
           WHERE admission_date <= LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
             AND (
               is_active = TRUE
               OR (
                 discharged_at IS NOT NULL
                 AND DATE(discharged_at) > LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
               )
             )`,
        );
        totalPatientsPrevMonthEnd = Number(c);
      } catch {
        // discharged_at 컬럼 없음 등
        totalPatientsPrevMonthEnd = totalPatients;
      }

      const totalPatientsMomChange = totalPatients - totalPatientsPrevMonthEnd;

      let todayVoiceRecords = 0;
      let yesterdayVoiceRecords = 0;
      let todayAiNursingRecords = 0;
      let yesterdayAiNursingRecords = 0;

      try {
        const [{ tv }] = await conn.query(
          `SELECT COUNT(*) AS tv FROM records
           WHERE creation_source = 'voice' AND DATE(created_at) = CURDATE()`,
        );
        const [{ yv }] = await conn.query(
          `SELECT COUNT(*) AS yv FROM records
           WHERE creation_source = 'voice' AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
        );
        const [{ ta }] = await conn.query(
          `SELECT COUNT(*) AS ta FROM records
           WHERE creation_source IN ('ai', 'ocr') AND DATE(created_at) = CURDATE()`,
        );
        const [{ ya }] = await conn.query(
          `SELECT COUNT(*) AS ya FROM records
           WHERE creation_source IN ('ai', 'ocr') AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
        );
        todayVoiceRecords = Number(tv);
        yesterdayVoiceRecords = Number(yv);
        todayAiNursingRecords = Number(ta);
        yesterdayAiNursingRecords = Number(ya);
      } catch {
        // creation_source 없음
      }

      return {
        totalPatients,
        totalPatientsMomChange,
        todayVoiceRecords,
        voiceRecordsDodChange: todayVoiceRecords - yesterdayVoiceRecords,
        todayAiNursingRecords,
        aiNursingRecordsDodChange: todayAiNursingRecords - yesterdayAiNursingRecords,
      };
    } finally {
      conn.release();
    }
  }

  // ── 유틸리티 (private) ──

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  }

  private formatTime(time: string): string {
    if (!time) return '';
    return String(time).slice(0, 5);
  }

  private calculateAge(birthDate: Date | string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  /** JSON data + record_type → 목록용 soapie 텍스트 생성 */
  private buildSoapieFromData(
    recordType: string,
    data: Record<string, any>,
    recordDate: Date | string,
    recordTime: string,
  ): string {
    if (recordType === '간호기록지' || recordType === 'SOAPIE') {
      const parts: string[] = [];
      if (data.situation) parts.push(`S: ${data.situation}`);
      if (data.objective) parts.push(`O: ${data.objective}`);
      if (data.assessment) parts.push(`A: ${data.assessment}`);
      if (data.plan) parts.push(`P: ${data.plan}`);
      if (data.intervention) parts.push(`I: ${data.intervention}`);
      if (data.evaluation) parts.push(`E: ${data.evaluation}`);
      return parts.join('\n');
    }
    if (recordType === 'SOAP') {
      const parts: string[] = [];
      if (data.situation) parts.push(`S: ${data.situation}`);
      if (data.objective) parts.push(`O: ${data.objective}`);
      if (data.assessment) parts.push(`A: ${data.assessment}`);
      if (data.plan) parts.push(`P: ${data.plan}`);
      return parts.join('\n');
    }
    if (recordType === '간호인계기록지' || recordType === 'SBAR') {
      const parts = [
        `[진료일시] ${this.formatDate(recordDate)} ${this.formatTime(recordTime)}`,
        `[작성자] ${data.작성자 ?? ''}`,
      ];
      if (data.situation) parts.push(`[S - 상황] ${data.situation}`);
      if (data.background) parts.push(`[B - 배경] ${data.background}`);
      if (data.assessment) parts.push(`[A - 사정] ${data.assessment}`);
      if (data.recommendation) parts.push(`[R - 권고] ${data.recommendation}`);
      return parts.join('\n');
    }
    if (recordType === '임상관찰기록지') {
      const parts = [
        `[진료일시] ${data.진료일시 ?? ''}`,
        `[작성자] ${data.작성자성명 ?? ''}`,
      ];
      if (data.진료과) parts.push(`[진료과] ${data.진료과}`);
      const vital = data.활력징후 ?? {};
      const vitals: string[] = [];
      if (vital.혈압) vitals.push(`혈압: ${vital.혈압}`);
      if (vital.맥박) vitals.push(`맥박: ${vital.맥박}회/분`);
      if (vital.체온) vitals.push(`체온: ${vital.체온}°C`);
      if (vital.호흡) vitals.push(`호흡: ${vital.호흡}회/분`);
      if (vital.산소포화도) vitals.push(`산소포화도: ${vital.산소포화도}%`);
      if (vital.혈당) vitals.push(`혈당: ${vital.혈당}`);
      if (vitals.length > 0) parts.push(`[활력징후] ${vitals.join(', ')}`);
      const addInfo = data.추가정보 ?? {};
      if (addInfo.간병유무) parts.push(`[간병유무] ${addInfo.간병유무}`);
      if (addInfo.도뇨관리) parts.push(`[도뇨관리] ${addInfo.도뇨관리}`);
      return parts.join('\n');
    }
    return '';
  }
}
