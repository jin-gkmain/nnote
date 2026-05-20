-- =====================================================
-- 간호기록 서비스 DB 스키마
-- MariaDB 10.11+
-- =====================================================

-- 데이터베이스가 없으면 생성 (docker-compose에서도 자동 생성됨)
CREATE DATABASE IF NOT EXISTS nursing_note
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nursing_note;

-- -----------------------------------------------------
-- 1. 환자 (patients)
-- is_active: 입원 중이면 TRUE, 퇴원하면 FALSE
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  patient_number VARCHAR(20)  NOT NULL COMMENT '환자번호 (예: P10001)',
  name          VARCHAR(50)   NOT NULL COMMENT '환자 이름',
  birth_date    DATE          NOT NULL COMMENT '생년월일',
  gender        ENUM('남','여') NOT NULL COMMENT '성별',
  room_number   VARCHAR(20)   NOT NULL COMMENT '병실 (예: 301호)',
  diagnosis     VARCHAR(200)  NOT NULL COMMENT '진단명',
  admission_date DATE         NOT NULL COMMENT '입원일',
  attending_doctor VARCHAR(50) NOT NULL COMMENT '담당의',
  allergies     VARCHAR(200)  DEFAULT '없음' COMMENT '알레르기',
  blood_type    VARCHAR(10)   NOT NULL COMMENT '혈액형 (예: A+)',
  insurance     VARCHAR(50)   NOT NULL COMMENT '보험 유형',
  emergency_contact VARCHAR(20) NOT NULL COMMENT '비상연락처',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE COMMENT '활성(입원중) 여부',
  discharged_at DATETIME      NULL DEFAULT NULL COMMENT '퇴원 처리 시각 (전월 입원자 수 비교용)',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_patient_number (patient_number)
) ENGINE=InnoDB COMMENT='환자 정보';


-- -----------------------------------------------------
-- 2. 간호기록지 (nursing_records) — SOAPIE 형식
-- S(주관적) O(객관적) A(사정) P(계획) I(중재) E(평가)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing_records (
  id              BIGINT      NOT NULL AUTO_INCREMENT,
  patient_id      BIGINT      NOT NULL COMMENT '환자 FK',
  document_number VARCHAR(20) NOT NULL COMMENT '문서번호',
  record_date     DATE        NOT NULL COMMENT '기록 날짜',
  record_time     TIME        NOT NULL COMMENT '기록 시간',
  subjective      TEXT        NULL     COMMENT 'S - 주관적 자료',
  objective       TEXT        NULL     COMMENT 'O - 객관적 자료',
  assessment      TEXT        NULL     COMMENT 'A - 사정',
  plan            TEXT        NULL     COMMENT 'P - 계획',
  intervention    TEXT        NULL     COMMENT 'I - 중재',
  evaluation      TEXT        NULL     COMMENT 'E - 평가',
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nursing_patient (patient_id),
  KEY idx_nursing_date    (record_date),
  CONSTRAINT fk_nursing_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='간호기록지 (SOAPIE)';


-- -----------------------------------------------------
-- 3. 간호인계기록지 (handover_records) — SBAR 형식
-- S(상황) B(배경) A(사정) R(권고)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS handover_records (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  patient_id      BIGINT       NOT NULL COMMENT '환자 FK',
  document_number VARCHAR(20)  NOT NULL COMMENT '문서번호',
  record_date     DATE         NOT NULL COMMENT '기록 날짜',
  record_time     TIME         NOT NULL COMMENT '기록 시간',
  author          VARCHAR(50)  NOT NULL COMMENT '작성자',
  situation       TEXT         NULL     COMMENT 'S - 상황',
  background      TEXT         NULL     COMMENT 'B - 배경',
  assessment      TEXT         NULL     COMMENT 'A - 사정',
  recommendation  TEXT         NULL     COMMENT 'R - 권고',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_handover_patient (patient_id),
  KEY idx_handover_date    (record_date),
  CONSTRAINT fk_handover_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='간호인계기록지 (SBAR)';


-- -----------------------------------------------------
-- 4. 임상관찰기록지 (clinical_observations)
-- 활력징후 및 관찰 항목
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_observations (
  id              BIGINT         NOT NULL AUTO_INCREMENT,
  patient_id      BIGINT         NOT NULL COMMENT '환자 FK',
  document_number VARCHAR(20)    NOT NULL COMMENT '문서번호',
  record_date     DATE           NOT NULL COMMENT '기록 날짜',
  record_time     TIME           NOT NULL COMMENT '기록 시간',
  author          VARCHAR(50)    NOT NULL COMMENT '작성자',
  department      VARCHAR(100)   NULL     COMMENT '진료과',
  blood_pressure  VARCHAR(20)    NULL     COMMENT '혈압 (예: 130/80)',
  pulse           INT            NULL     COMMENT '맥박 (회/분)',
  temperature     DECIMAL(4, 1)  NULL     COMMENT '체온 (°C)',
  respiration     INT            NULL     COMMENT '호흡수 (회/분)',
  spo2            INT            NULL     COMMENT '산소포화도 (%)',
  blood_sugar     INT            NULL     COMMENT '혈당 (mg/dL)',
  caregiver_type  VARCHAR(50)    NULL     COMMENT '간병유무 (보호자/간병인/가족/없음)',
  catheter_care   VARCHAR(100)   NULL     COMMENT '도뇨관리',
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_observation_patient (patient_id),
  KEY idx_observation_date    (record_date),
  CONSTRAINT fk_observation_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='임상관찰기록지';


-- -----------------------------------------------------
-- 5. 통합 기록 테이블 (records)
-- 모든 기록지를 한 테이블에 저장, data는 JSON, record_type으로 분류
-- 기존 2~4번 테이블 대신 이 테이블만 사용 가능
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS records (
  id              BIGINT        NOT NULL AUTO_INCREMENT,
  patient_id      BIGINT        NOT NULL COMMENT '환자 FK',
  record_type     VARCHAR(30)   NOT NULL COMMENT '분류: 간호기록지, 간호인계기록지, 임상관찰기록지',
  title           VARCHAR(512)  NOT NULL DEFAULT '' COMMENT '사용자 지정 기록 제목',
  document_number VARCHAR(20)   NOT NULL COMMENT '문서번호',
  record_date     DATE          NOT NULL COMMENT '기록 날짜',
  record_time     TIME          NOT NULL COMMENT '기록 시간',
  data            JSON          NOT NULL COMMENT '기록 내용 (JSON)',
  creation_source ENUM('manual','voice','ai','ocr') NOT NULL DEFAULT 'manual' COMMENT '생성 경로: 직접/음성/AI/OCR',
  emr_sync_status ENUM('pending','sent') NOT NULL DEFAULT 'pending' COMMENT 'EMR 연동: 전송 전/후',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_records_patient (patient_id),
  KEY idx_records_type    (record_type),
  KEY idx_records_date    (record_date),
  CONSTRAINT fk_records_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='통합 기록 (JSON + record_type)';
