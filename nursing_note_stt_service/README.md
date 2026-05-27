# nursing_note_stt_service

WhisperX + pyannote 기반 STT·화자 분리 API 서비스입니다.

## 1) 가상환경 및 의존성 설치

```bash
cd nursing_note_stt_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) 환경 변수

- `HF_TOKEN`: pyannote diarization 모델 접근 토큰 (WhisperX 화자 분리용)
- `WHISPERX_MODEL`: WhisperX / faster-whisper 모델명 (Docker CPU 기본값: `base`). 더 높은 정확도가 필요하고 메모리가 충분하면 `small`, `medium`, `large-v3`로 올릴 수 있습니다. `distil-large-v3` 는 Hugging Face 기준 **영어** 증류 모델이라 한국어 음성이 영어로 잘못 전사될 수 있습니다.
- `WHISPERX_COMPUTE_TYPE`: faster-whisper 계산 타입 (Docker CPU 기본값: `int8`)

```bash
cp .env.example .env
# .env 파일을 열어서 HF_TOKEN 값을 설정하세요.
```

## 3) 실행

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 4) API

- `GET /health` — `whisperx_available` 포함
- `POST /v1/transcribe` (multipart)
  - 필수: `file`
  - 선택: `language`, `diarization`, `word_timestamps`, `stt_engine` (반드시 `whisperx`, 기본값 동일)
