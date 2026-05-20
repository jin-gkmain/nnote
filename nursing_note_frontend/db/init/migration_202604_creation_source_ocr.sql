-- creation_source에 OCR 경로 추가 (기존 DB 업그레이드용)
ALTER TABLE records
  MODIFY COLUMN creation_source ENUM('manual','voice','ai','ocr') NOT NULL DEFAULT 'manual'
  COMMENT '생성 경로: 직접/음성/AI/OCR';
