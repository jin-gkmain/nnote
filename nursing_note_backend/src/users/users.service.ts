import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import type { AppRole } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequestRow {
  id: number;
  user_id: number;
  department_snapshot: string;
  license_number: string;
  status: VerificationRequestStatus;
  rejected_reason: string | null;
  reviewed_at: Date | null;
  reviewed_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow {
  id: number;
  login_id: string;
  password_hash: string;
  name: string;
  department: string;
  role: AppRole;
  is_active?: boolean | number;
  verification_status?: VerificationStatus;
  verification_updated_at?: Date | null;
  verification_verified_by?: number | null;
  verification_rejected_reason?: string | null;
}

export interface SafeUser {
  id: number;
  loginId: string;
  name: string;
  department: string;
  role: AppRole;
  isActive: boolean;
  verificationStatus: VerificationStatus;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject(DB_POOL) private readonly pool: mariadb.Pool,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureUsersTable();
    await this.ensureUserVerificationColumns();
    await this.ensureUserActiveColumn();
    await this.ensureUserVerificationRequestsTable();
    await this.ensureBootstrapAdmin();
  }

  private async ensureUsersTable(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS users (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          login_id VARCHAR(64) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(128) NOT NULL,
          department VARCHAR(256) NOT NULL DEFAULT '',
          role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
          verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
          verification_updated_at TIMESTAMP NULL DEFAULT NULL,
          verification_verified_by INT UNSIGNED NULL DEFAULT NULL,
          verification_rejected_reason VARCHAR(512) NULL DEFAULT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_users_login_id (login_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    } finally {
      conn.release();
    }
  }

  private async ensureUserVerificationColumns(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      const needed: Array<{ name: string; ddl: string }> = [
        {
          name: 'verification_status',
          ddl: "ALTER TABLE users ADD COLUMN verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified'",
        },
        {
          name: 'verification_updated_at',
          ddl: 'ALTER TABLE users ADD COLUMN verification_updated_at TIMESTAMP NULL DEFAULT NULL',
        },
        {
          name: 'verification_verified_by',
          ddl: 'ALTER TABLE users ADD COLUMN verification_verified_by INT UNSIGNED NULL DEFAULT NULL',
        },
        {
          name: 'verification_rejected_reason',
          ddl: 'ALTER TABLE users ADD COLUMN verification_rejected_reason VARCHAR(512) NULL DEFAULT NULL',
        },
      ];

      for (const col of needed) {
        const exists = await this.columnExists(conn, 'users', col.name);
        if (!exists) {
          await conn.query(col.ddl);
        }
      }
    } catch (e) {
      throw new InternalServerErrorException(
        `users 테이블 스키마(verification) 보정에 실패했습니다: ${(e as Error).message}`,
      );
    } finally {
      conn.release();
    }
  }

  private async ensureUserActiveColumn(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      const exists = await this.columnExists(conn, 'users', 'is_active');
      if (!exists) {
        await conn.query(
          'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
        );
      }
    } catch (e) {
      throw new InternalServerErrorException(
        `users 테이블 스키마(is_active) 보정에 실패했습니다: ${(e as Error).message}`,
      );
    } finally {
      conn.release();
    }
  }

  private async ensureUserVerificationRequestsTable(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS user_verification_requests (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNSIGNED NOT NULL,
          department_snapshot VARCHAR(256) NOT NULL DEFAULT '',
          license_number VARCHAR(64) NOT NULL,
          status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          rejected_reason VARCHAR(512) NULL DEFAULT NULL,
          reviewed_at TIMESTAMP NULL DEFAULT NULL,
          reviewed_by_user_id INT UNSIGNED NULL DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_uvr_user_id (user_id),
          INDEX idx_uvr_status_created_at (status, created_at),
          CONSTRAINT fk_uvr_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    } catch (e) {
      throw new InternalServerErrorException(
        `user_verification_requests 테이블 생성에 실패했습니다: ${(e as Error).message}`,
      );
    } finally {
      conn.release();
    }
  }

  private async columnExists(
    conn: mariadb.PoolConnection,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const rows = (await conn.query(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [tableName, columnName],
    )) as Array<{ c: number }>;
    return Number(rows[0]?.c ?? 0) > 0;
  }

  private async ensureBootstrapAdmin(): Promise<void> {
    const login = this.config.get<string>('BOOTSTRAP_ADMIN_LOGIN');
    const password = this.config.get<string>('BOOTSTRAP_ADMIN_PASSWORD');
    const name = this.config.get<string>('BOOTSTRAP_ADMIN_NAME', '관리자');
    if (!login?.trim() || !password) return;
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        'SELECT COUNT(*) AS c FROM users',
      )) as { c: number }[];
      if (Number(rows[0]?.c) > 0) return;
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        `INSERT INTO users (login_id, password_hash, name, department, role)
         VALUES (?, ?, ?, '', 'admin')`,
        [login.trim(), hash, name.trim()],
      );
      console.log(`✅ 부트스트랩 어드민 계정 생성: ${login.trim()}`);
    } catch (e) {
      console.warn(
        '부트스트랩 어드민 생성 스킵(테이블 없음 또는 DB 오류):',
        (e as Error).message,
      );
    } finally {
      conn.release();
    }
  }

  private parseIsActive(raw: unknown): boolean {
    if (raw === undefined || raw === null) return true;
    if (typeof raw === 'boolean') return raw;
    return Number(raw) === 1;
  }

  private mapRow(row: UserRow): SafeUser {
    return {
      id: row.id,
      loginId: row.login_id,
      name: row.name,
      department: row.department ?? '',
      role: row.role,
      isActive: this.parseIsActive(row.is_active),
      verificationStatus: (row.verification_status ??
        'unverified') as VerificationStatus,
    };
  }

  async findByLoginId(loginId: string): Promise<UserRow | null> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        'SELECT id, login_id, password_hash, name, department, role, verification_status, is_active FROM users WHERE login_id = ?',
        [loginId],
      )) as UserRow[];
      return rows[0] ?? null;
    } finally {
      conn.release();
    }
  }

  async findById(id: number): Promise<SafeUser | null> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        'SELECT id, login_id, name, department, role, verification_status, is_active FROM users WHERE id = ?',
        [id],
      )) as Omit<UserRow, 'password_hash'>[];
      const r = rows[0];
      if (!r) return null;
      return this.mapRow({
        ...r,
        password_hash: '',
      } as UserRow);
    } finally {
      conn.release();
    }
  }

  async validateUser(loginId: string, password: string): Promise<SafeUser | null> {
    const row = await this.findByLoginId(loginId);
    if (!row) return null;
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return null;
    if (!this.parseIsActive(row.is_active)) return null;
    return this.mapRow(row);
  }

  /** 로그인: 비활성 계정은 별도 메시지로 구분 */
  async authenticateForLogin(loginId: string, password: string): Promise<SafeUser> {
    const row = await this.findByLoginId(loginId);
    if (!row) {
      throw new UnauthorizedException('로그인 정보가 올바르지 않습니다.');
    }
    if (!this.parseIsActive(row.is_active)) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      throw new UnauthorizedException('로그인 정보가 올바르지 않습니다.');
    }
    return this.mapRow(row);
  }

  async listAll(): Promise<SafeUser[]> {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        'SELECT id, login_id, name, department, role, verification_status, is_active FROM users ORDER BY id ASC',
      )) as Omit<UserRow, 'password_hash'>[];
      return rows.map((r) =>
        this.mapRow({ ...r, password_hash: '' } as UserRow),
      );
    } finally {
      conn.release();
    }
  }

  async createUser(dto: CreateUserDto): Promise<SafeUser> {
    const conn = await this.pool.getConnection();
    try {
      const exists = (await conn.query(
        'SELECT id FROM users WHERE login_id = ?',
        [dto.loginId.trim()],
      )) as { id: number }[];
      if (exists.length) throw new ConflictException('이미 사용 중인 로그인 ID입니다.');
      const hash = await bcrypt.hash(dto.password, 10);
      await conn.query(
        `INSERT INTO users (login_id, password_hash, name, department, role, verification_status, is_active)
         VALUES (?, ?, ?, '', 'user', 'unverified', 1)`,
        [dto.loginId.trim(), hash, dto.name.trim()],
      );
      const row = await this.findByLoginId(dto.loginId.trim());
      if (!row) throw new NotFoundException();
      return this.mapRow(row);
    } finally {
      conn.release();
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<SafeUser> {
    const conn = await this.pool.getConnection();
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (dto.name != null) {
        fields.push('name = ?');
        values.push(dto.name.trim());
      }
      if (dto.department != null) {
        fields.push('department = ?');
        values.push(dto.department.trim());
      }
      if (!fields.length) {
        const u = await this.findById(userId);
        if (!u) throw new NotFoundException();
        return u;
      }
      values.push(userId);
      await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      const u = await this.findById(userId);
      if (!u) throw new NotFoundException();
      return u;
    } finally {
      conn.release();
    }
  }

  async updateMyProfile(
    userId: number,
    actorRole: AppRole,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    // 요구사항: 소속 변경은 어드민만 가능
    const safeDto: UpdateProfileDto = {
      name: dto.name,
      department: actorRole === 'admin' ? dto.department : undefined,
    };
    return this.updateProfile(userId, safeDto);
  }

  async adminUpdateUser(
    actorUserId: number,
    targetUserId: number,
    dto: { name?: string; department?: string; isActive?: boolean },
  ): Promise<SafeUser> {
    if (dto.isActive === false) {
      if (targetUserId === actorUserId) {
        throw new ForbiddenException('본인 계정은 비활성화할 수 없습니다.');
      }
      const target = await this.findById(targetUserId);
      if (!target) throw new NotFoundException();
      if (target.role === 'admin' && target.isActive) {
        const conn = await this.pool.getConnection();
        try {
          const admins = (await conn.query(
            "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1",
          )) as { c: number }[];
          if (Number(admins[0]?.c) <= 1) {
            throw new ForbiddenException(
              '마지막 활성 어드민 계정은 비활성화할 수 없습니다.',
            );
          }
        } finally {
          conn.release();
        }
      }
    }

    const conn = await this.pool.getConnection();
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (dto.name != null) {
        fields.push('name = ?');
        values.push(dto.name.trim());
      }
      if (dto.department != null) {
        fields.push('department = ?');
        values.push(dto.department.trim());
      }
      if (dto.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(dto.isActive ? 1 : 0);
      }
      if (!fields.length) {
        const u = await this.findById(targetUserId);
        if (!u) throw new NotFoundException();
        return u;
      }
      values.push(targetUserId);
      await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      const u = await this.findById(targetUserId);
      if (!u) throw new NotFoundException();
      return u;
    } finally {
      conn.release();
    }
  }

  async getMyVerification(userId: number): Promise<{
    verificationStatus: VerificationStatus;
    lastRequest:
      | {
          id: number;
          status: VerificationRequestStatus;
          departmentSnapshot: string;
          licenseNumber: string;
          rejectedReason: string | null;
          createdAt: string;
          reviewedAt: string | null;
          reviewedByUserId: number | null;
        }
      | null;
  }> {
    const conn = await this.pool.getConnection();
    try {
      const userRows = (await conn.query(
        'SELECT verification_status FROM users WHERE id = ?',
        [userId],
      )) as Array<{ verification_status: VerificationStatus }>;
      const status = (userRows[0]?.verification_status ??
        'unverified') as VerificationStatus;

      const rows = (await conn.query(
        `SELECT id, user_id, department_snapshot, license_number, status,
                rejected_reason, reviewed_at, reviewed_by_user_id, created_at, updated_at
         FROM user_verification_requests
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId],
      )) as VerificationRequestRow[];
      const last = rows[0];
      return {
        verificationStatus: status,
        lastRequest: last
          ? {
              id: Number(last.id),
              status: last.status,
              departmentSnapshot: String(last.department_snapshot ?? ''),
              licenseNumber: String(last.license_number ?? ''),
              rejectedReason: last.rejected_reason ?? null,
              createdAt: (last.created_at instanceof Date
                ? last.created_at.toISOString()
                : new Date(last.created_at).toISOString()),
              reviewedAt: last.reviewed_at
                ? last.reviewed_at instanceof Date
                  ? last.reviewed_at.toISOString()
                  : new Date(last.reviewed_at).toISOString()
                : null,
              reviewedByUserId: last.reviewed_by_user_id
                ? Number(last.reviewed_by_user_id)
                : null,
            }
          : null,
      };
    } finally {
      conn.release();
    }
  }

  async createMyVerificationRequest(
    userId: number,
    department: string,
    licenseNumber: string,
  ): Promise<{ requestId: number; verificationStatus: VerificationStatus }> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const users = (await conn.query(
        'SELECT id, department, verification_status FROM users WHERE id = ?',
        [userId],
      )) as Array<{ id: number; department: string; verification_status: VerificationStatus }>;
      const u = users[0];
      if (!u) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      const current = (u.verification_status ?? 'unverified') as VerificationStatus;
      if (current === 'pending') {
        throw new ConflictException('이미 인증 요청이 진행 중입니다.');
      }
      if (current === 'verified') {
        throw new ConflictException('이미 인증이 완료된 계정입니다.');
      }

      const res: any = await conn.query(
        `INSERT INTO user_verification_requests
           (user_id, department_snapshot, license_number, status)
         VALUES (?, ?, ?, 'pending')`,
        [userId, department.trim(), licenseNumber.trim()],
      );

      await conn.query(
        `UPDATE users
         SET verification_status = 'pending',
             verification_updated_at = CURRENT_TIMESTAMP,
             verification_verified_by = NULL,
             verification_rejected_reason = NULL,
             department = ?
         WHERE id = ?`,
        [department.trim(), userId],
      );

      await conn.commit();
      return {
        requestId: Number(res.insertId),
        verificationStatus: 'pending',
      };
    } catch (e) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback failure
      }
      throw e;
    } finally {
      conn.release();
    }
  }

  async adminListVerificationRequests(params: {
    status?: VerificationRequestStatus;
  }): Promise<
    Array<{
      id: number;
      userId: number;
      userLoginId: string;
      userName: string;
      departmentSnapshot: string;
      licenseNumber: string;
      status: VerificationRequestStatus;
      rejectedReason: string | null;
      createdAt: string;
    }>
  > {
    const conn = await this.pool.getConnection();
    try {
      const where = params.status ? 'WHERE r.status = ?' : '';
      const args = params.status ? [params.status] : [];
      const rows = (await conn.query(
        `SELECT r.id, r.user_id, r.department_snapshot, r.license_number, r.status,
                r.rejected_reason, r.created_at,
                u.login_id AS user_login_id, u.name AS user_name
         FROM user_verification_requests r
         INNER JOIN users u ON u.id = r.user_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT 200`,
        args,
      )) as any[];
      return rows.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        userLoginId: String(r.user_login_id ?? ''),
        userName: String(r.user_name ?? ''),
        departmentSnapshot: String(r.department_snapshot ?? ''),
        licenseNumber: String(r.license_number ?? ''),
        status: (r.status ?? 'pending') as VerificationRequestStatus,
        rejectedReason: r.rejected_reason ?? null,
        createdAt: (r.created_at instanceof Date
          ? r.created_at.toISOString()
          : new Date(r.created_at).toISOString()),
      }));
    } finally {
      conn.release();
    }
  }

  async adminApproveVerificationRequest(
    requestId: number,
    adminUserId: number,
  ): Promise<{ ok: true }> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const rows = (await conn.query(
        `SELECT id, user_id, status
         FROM user_verification_requests
         WHERE id = ?`,
        [requestId],
      )) as Array<{ id: number; user_id: number; status: VerificationRequestStatus }>;
      const reqRow = rows[0];
      if (!reqRow) throw new NotFoundException('인증 요청을 찾을 수 없습니다.');
      if (reqRow.status !== 'pending') {
        throw new ConflictException('이미 처리된 인증 요청입니다.');
      }

      await conn.query(
        `UPDATE user_verification_requests
         SET status = 'approved',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by_user_id = ?,
             rejected_reason = NULL
         WHERE id = ?`,
        [adminUserId, requestId],
      );

      await conn.query(
        `UPDATE users
         SET verification_status = 'verified',
             verification_updated_at = CURRENT_TIMESTAMP,
             verification_verified_by = ?,
             verification_rejected_reason = NULL
         WHERE id = ?`,
        [adminUserId, Number(reqRow.user_id)],
      );

      await conn.commit();
      return { ok: true };
    } catch (e) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback failure
      }
      throw e;
    } finally {
      conn.release();
    }
  }

  async adminRejectVerificationRequest(
    requestId: number,
    adminUserId: number,
    reason?: string,
  ): Promise<{ ok: true }> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const rows = (await conn.query(
        `SELECT id, user_id, status
         FROM user_verification_requests
         WHERE id = ?`,
        [requestId],
      )) as Array<{ id: number; user_id: number; status: VerificationRequestStatus }>;
      const reqRow = rows[0];
      if (!reqRow) throw new NotFoundException('인증 요청을 찾을 수 없습니다.');
      if (reqRow.status !== 'pending') {
        throw new ConflictException('이미 처리된 인증 요청입니다.');
      }

      await conn.query(
        `UPDATE user_verification_requests
         SET status = 'rejected',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by_user_id = ?,
             rejected_reason = ?
         WHERE id = ?`,
        [adminUserId, (reason ?? '').trim() || null, requestId],
      );

      await conn.query(
        `UPDATE users
         SET verification_status = 'rejected',
             verification_updated_at = CURRENT_TIMESTAMP,
             verification_verified_by = ?,
             verification_rejected_reason = ?
         WHERE id = ?`,
        [adminUserId, (reason ?? '').trim() || null, Number(reqRow.user_id)],
      );

      await conn.commit();
      return { ok: true };
    } catch (e) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback failure
      }
      throw e;
    } finally {
      conn.release();
    }
  }

  async deleteUser(actorUserId: number, targetId: number): Promise<void> {
    if (actorUserId === targetId) {
      throw new ForbiddenException('본인 계정은 삭제할 수 없습니다.');
    }
    const conn = await this.pool.getConnection();
    try {
      const target = (await conn.query(
        'SELECT id, role FROM users WHERE id = ?',
        [targetId],
      )) as { id: number; role: AppRole }[];
      if (!target.length) throw new NotFoundException();
      if (target[0].role === 'admin') {
        const admins = (await conn.query(
          "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'",
        )) as { c: number }[];
        if (Number(admins[0]?.c) <= 1) {
          throw new ForbiddenException('마지막 어드민 계정은 삭제할 수 없습니다.');
        }
      }
      await conn.query('DELETE FROM users WHERE id = ?', [targetId]);
    } finally {
      conn.release();
    }
  }
}
