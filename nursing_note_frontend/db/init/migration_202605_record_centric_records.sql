-- 기존 DB: records를 환자 없이 저장 가능한 기록 중심 모델로 전환
USE nursing_note;

SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'records'
    AND COLUMN_NAME = 'patient_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_fk_sql := IF(
  @fk_name IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE records DROP FOREIGN KEY `', @fk_name, '`')
);
PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

ALTER TABLE records
  MODIFY COLUMN patient_id BIGINT NULL COMMENT '레거시 환자 FK',
  MODIFY COLUMN creation_source ENUM('manual','voice','ai','ocr','record_based') NOT NULL DEFAULT 'manual'
    COMMENT '생성 경로: 직접/음성/AI/OCR/기록기반';
