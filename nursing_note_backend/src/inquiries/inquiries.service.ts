import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type * as mariadb from 'mariadb';
import { DB_POOL } from '../database/database.module';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

type InquiryStatus = 'pending' | 'in_progress' | 'completed';

interface InquiryRow {
  id: number;
  member_login_id: string | null;
  reply_email: string;
  title: string;
  content: string;
  status: InquiryStatus;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class InquiriesService implements OnModuleInit {
  constructor(@Inject(DB_POOL) private readonly pool: mariadb.Pool) {}

  async onModuleInit(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS inquiries (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          member_login_id VARCHAR(64) NULL DEFAULT NULL,
          reply_email VARCHAR(255) NOT NULL,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_inquiries_status_created_at (status, created_at),
          INDEX idx_inquiries_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    } finally {
      conn.release();
    }
  }

  private mapRow(row: InquiryRow) {
    return {
      id: Number(row.id),
      memberLoginId: row.member_login_id,
      replyEmail: row.reply_email,
      title: row.title,
      content: row.content,
      status: row.status,
      isMember: Boolean(row.member_login_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(dto: CreateInquiryDto, memberLoginId: string | null = null) {
    const replyEmail = dto.replyEmail.trim();
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!replyEmail || title.length < 2 || content.length < 5) {
      throw new BadRequestException('문의 입력 내용을 다시 확인해주세요.');
    }
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.query(
        `INSERT INTO inquiries (member_login_id, reply_email, title, content)
         VALUES (?, ?, ?, ?)`,
        [
          memberLoginId,
          replyEmail,
          title,
          content,
        ],
      );
      return { id: Number(result.insertId), ok: true };
    } finally {
      conn.release();
    }
  }

  async list(sort: 'latest' | 'oldest' = 'latest') {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        `SELECT id, member_login_id, reply_email, title, content, status, created_at, updated_at
         FROM inquiries
         ORDER BY created_at ${sort === 'oldest' ? 'ASC' : 'DESC'}, id ${sort === 'oldest' ? 'ASC' : 'DESC'}`,
      )) as InquiryRow[];
      return rows.map((row) => this.mapRow(row));
    } finally {
      conn.release();
    }
  }

  async findOne(id: number) {
    const conn = await this.pool.getConnection();
    try {
      const rows = (await conn.query(
        `SELECT id, member_login_id, reply_email, title, content, status, created_at, updated_at
         FROM inquiries WHERE id = ?`,
        [id],
      )) as InquiryRow[];
      if (!rows[0]) throw new NotFoundException('문의를 찾을 수 없습니다.');
      return this.mapRow(rows[0]);
    } finally {
      conn.release();
    }
  }

  async updateStatus(id: number, status: InquiryStatus) {
    const conn = await this.pool.getConnection();
    try {
      const result = await conn.query(
        'UPDATE inquiries SET status = ? WHERE id = ?',
        [status, id],
      );
      if (Number(result.affectedRows) === 0) {
        throw new NotFoundException('문의를 찾을 수 없습니다.');
      }
    } finally {
      conn.release();
    }
    return this.findOne(id);
  }
}
