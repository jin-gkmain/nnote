-- 기존 DB에 한 번만 적용: 대시보드 통계용 컬럼 추가
-- 이미 컬럼이 있으면 오류가 날 수 있음 — 무시하거나 주석 처리 후 실행

USE nursing_note;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS discharged_at DATETIME NULL DEFAULT NULL
    COMMENT '퇴원 처리 시각 (전월 입원자 수 비교용)'
  AFTER is_active;

UPDATE patients
SET discharged_at = updated_at
WHERE is_active = FALSE AND discharged_at IS NULL;

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS creation_source ENUM('manual','voice','ai','ocr','record_based') NOT NULL DEFAULT 'manual'
    COMMENT '생성 경로: 직접/음성/AI/OCR/기록기반'
  AFTER data;
