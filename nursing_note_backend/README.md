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
| stt | WhisperX 기반 음성-텍스트 변환 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경 변수를 설정합니다.

```
API_PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nursing_note
DB_USER=nursing_user
DB_PASSWORD=nursing_pass_1234
JWT_SECRET=dev-change-me-in-production
JWT_EXPIRES=7d
STT_PROVIDER=legacy
PY_STT_TIMEOUT_MS=180000
PY_STT_API_URL=http://127.0.0.1:8000/v1/transcribe
```

빠르게 시작하려면 [`nursing_note_backend/.env.example`](/Users/blisian/.codex/worktrees/a6be/nnote/nursing_note_backend/.env.example:1) 를 복사해 `.env`로 사용하면 됩니다.

기능별 추가 환경 변수:

- AI 초안 생성: `CLOVA_API_URL`, `CLOVA_API_SECRET_KEY`
- OCR: `NAVER_OCR_API_URL`, `NAVER_OCR_SECRET_KEY`
- STT(로컬 WhisperX): `STT_PROVIDER=legacy`, `PY_STT_API_URL`
- 자동완성(Qdrant): `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`
- 초기 관리자 자동 생성(선택): `BOOTSTRAP_ADMIN_LOGIN`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME`

### 3. 개발 서버 실행

```bash
npm run dev
```

STT는 로컬 WhisperX 서비스를 사용합니다. 백엔드 `.env`에 `STT_PROVIDER=legacy`와 `PY_STT_API_URL`을 설정한 뒤 WhisperX 서비스를 함께 실행합니다.

```bash
cd ../nursing_note_stt_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Docker Compose에서 WhisperX까지 같이 띄울 때는 `docker compose --profile local-stt up -d`를 사용하고, 컨테이너 내부 백엔드 기준 `PY_STT_API_URL=http://stt:8000/v1/transcribe`로 설정합니다.

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
