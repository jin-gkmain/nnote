# Nursing Note API Server

간호기록 서비스 백엔드 API 서버입니다.

## 기술 스택

- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Database:** MariaDB
- **Runtime:** Node.js

## 주요 기능 (모듈)

| 모듈 | 설명 |
| --- | --- |
| patients | 환자 정보 관리 |
| nursing-records | 간호 기록 관리 |
| clinical-observations | 임상 관찰 기록 관리 |
| handover-records | 인수인계 기록 관리 |
| ai-draft | AI 기반 초안 생성 |
| ocr | OCR 텍스트 인식 |
| stt | 음성-텍스트 변환 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경 변수를 설정합니다.

```
API_PORT=3001
PY_STT_API_URL=http://127.0.0.1:8000/v1/transcribe
PY_STT_TIMEOUT_MS=180000
```

### 3. 개발 서버 실행

```bash
npm run dev
```

신규 WhisperX 서비스와 연동할 때는 아래처럼 실행합니다.

```bash
cd ../nursing_note_stt_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

서버가 `http://localhost:3001` 에서 실행되며, 모든 API 엔드포인트는 `/api` 접두사로 시작합니다.

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (watch 모드) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 실행 |

## 프로젝트 구조

```
src/
├── main.ts                    # 앱 진입점
├── app.module.ts              # 루트 모듈
├── database/                  # DB 연결 설정
├── patients/                  # 환자 관리
├── nursing-records/           # 간호 기록
├── clinical-observations/     # 임상 관찰 기록
├── handover-records/          # 인수인계 기록
├── ai-draft/                  # AI 초안 생성
├── ocr/                       # OCR 텍스트 인식
└── stt/                       # 음성-텍스트 변환
```