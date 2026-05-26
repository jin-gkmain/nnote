-- 기존 DB: EMR 전송 상태 컬럼 (대시보드 기록 목록용)
USE nursing_note;

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS emr_sync_status ENUM('pending','sent') NOT NULL DEFAULT 'pending'
    COMMENT 'EMR 연동: 전송 전/후'
  AFTER creation_source;
