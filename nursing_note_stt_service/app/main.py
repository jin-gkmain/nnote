import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from dotenv import load_dotenv

load_dotenv()

try:
    import torch
    import whisperx
except Exception:  # pragma: no cover - runtime dependency issue
    torch = None
    whisperx = None

app = FastAPI(title="nursing-note-stt-service", version="0.1.0")


def _get_device() -> str:
    if torch is None:
        return "cpu"
    return "cuda" if torch.cuda.is_available() else "cpu"


def _build_speaker_label(speaker_name: str, speaker_map: dict[str, int]) -> str:
    if speaker_name not in speaker_map:
        speaker_map[speaker_name] = len(speaker_map) + 1
    return f"화자 {speaker_map[speaker_name]}"


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_language(code: str | None) -> str:
    """WhisperX 언어 코드. 비어 있으면 한국어 기본."""
    if not code or not str(code).strip():
        return "ko"
    return str(code).strip().lower()


def _normalize_stt_engine(raw: str | None) -> str:
    e = (raw or "whisperx").strip().lower()
    if e != "whisperx":
        raise HTTPException(
            status_code=400,
            detail='stt_engine must be "whisperx".',
        )
    return e


def _warn_if_english_only_model(model_name: str, language: str) -> None:
    """distil-large-v3 등은 HF 상 영어 증류 모델이라 ko를 지정해도 faster-whisper가 영어 경로로만 동작할 수 있음."""
    lower = model_name.lower()
    if language != "en" and ("distil-large" in lower or lower.endswith(".en")):
        logger.warning(
            "WHISPERX_MODEL=%s 는 영어 전용에 가깝습니다. 한국어 STT에는 large-v3 등 다국어 모델을 권장합니다.",
            model_name,
        )


def _transcribe_whisperx(
    upload_path: str,
    filename: str,
    language: str,
    diarization: bool,
    word_timestamps: bool,
    started_at: float,
) -> dict[str, Any]:
    if whisperx is None:
        raise HTTPException(status_code=500, detail="WhisperX dependency is unavailable.")
    device = _get_device()
    model_name = os.getenv("WHISPERX_MODEL", "large-v3")
    _warn_if_english_only_model(model_name, language)
    stt_model = whisperx.load_model(model_name, device=device, language=language)
    asr_result = stt_model.transcribe(upload_path, language=language)
    align_model, align_metadata = whisperx.load_align_model(
        language_code=language,
        device=device,
    )
    aligned_result = whisperx.align(
        asr_result.get("segments", []),
        align_model,
        align_metadata,
        upload_path,
        device,
    )
    diarize_df = None
    diarization_skip_reason: str | None = None
    hf_token = os.getenv("HF_TOKEN", "").strip()
    should_run_diarization = diarization and len(hf_token) > 0
    if should_run_diarization:
        try:
            from whisperx.diarize import DiarizationPipeline

            diarize_pipeline = DiarizationPipeline(
                token=hf_token or None,
                device=device,
            )
            diarize_df = diarize_pipeline(upload_path)
        except Exception as diarize_exc:
            diarization_skip_reason = str(diarize_exc)[:500]
            diarize_df = None
    final_result = (
        whisperx.assign_word_speakers(diarize_df, aligned_result)
        if diarize_df is not None and not diarize_df.empty
        else aligned_result
    )
    speaker_index: dict[str, int] = {}
    segments_output: list[dict[str, Any]] = []
    speakers_aggregate: dict[str, dict[str, Any]] = {}
    for index, segment in enumerate(final_result.get("segments", [])):
        speaker = str(segment.get("speaker") or "SPEAKER_UNKNOWN")
        speaker_label = _build_speaker_label(speaker, speaker_index)
        start_sec = _to_float(segment.get("start"), 0.0)
        end_sec = _to_float(segment.get("end"), start_sec)
        segment_text = str(segment.get("text") or "").strip()
        words_output: list[dict[str, Any]] = []
        if word_timestamps and isinstance(segment.get("words"), list):
            for word in segment["words"]:
                if not isinstance(word, dict):
                    continue
                words_output.append(
                    {
                        "startSec": _to_float(word.get("start"), 0.0),
                        "endSec": _to_float(word.get("end"), 0.0),
                        "word": str(word.get("word") or "").strip(),
                        "confidence": _to_float(word.get("score"), 0.0),
                    },
                )
        segments_output.append(
            {
                "id": f"seg_{index + 1:04d}",
                "speaker": speaker,
                "speakerLabel": speaker_label,
                "startSec": start_sec,
                "endSec": end_sec,
                "text": segment_text,
                "words": words_output,
            },
        )
        speech_duration = max(0.0, end_sec - start_sec)
        existing = speakers_aggregate.get(
            speaker,
            {
                "speaker": speaker,
                "label": speaker_label,
                "totalSpeechSec": 0.0,
                "segmentCount": 0,
            },
        )
        existing["totalSpeechSec"] += speech_duration
        existing["segmentCount"] += 1
        speakers_aggregate[speaker] = existing
    transcript_lines = [
        f"{segment['speakerLabel']}: {segment['text']}"
        for segment in segments_output
        if segment["text"]
    ]
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    audio_duration_sec = 0.0
    if segments_output:
        audio_duration_sec = max(segment["endSec"] for segment in segments_output)
    return {
        "success": True,
        "filename": filename,
        "language": language,
        "duration_sec": audio_duration_sec,
        "text": "\n".join(transcript_lines).strip(),
        "segments": segments_output,
        "speakers": list(speakers_aggregate.values()),
        "meta": {
            "engine": "whisperx+pyannote",
            "model": model_name,
            "processing_ms": elapsed_ms,
            **(
                {"diarization": "skipped", "diarization_reason": diarization_skip_reason}
                if diarization_skip_reason
                else {}
            ),
        },
    }


@app.get("/health")
def get_health() -> dict[str, Any]:
    return {
        "status": "ok",
        "whisperx_available": whisperx is not None,
    }


@app.post("/v1/transcribe")
async def post_transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="ko"),
    diarization: bool = Form(default=True),
    word_timestamps: bool = Form(default=False),
    stt_engine: str = Form(default="whisperx"),
) -> dict[str, Any]:
    started_at = time.perf_counter()
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio is empty.")

    _normalize_stt_engine(stt_engine)

    lang = _normalize_language(language)
    upload_path = f"/tmp/stt-{int(time.time() * 1000)}-{file.filename or 'audio'}.bin"
    with open(upload_path, "wb") as uploaded_file:
        uploaded_file.write(raw_bytes)

    filename = file.filename or "recording.wav"

    try:
        return _transcribe_whisperx(
            upload_path,
            filename,
            lang,
            diarization,
            word_timestamps,
            started_at,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - runtime heavy
        raise HTTPException(status_code=500, detail=f"STT processing failed: {exc}") from exc
    finally:
        try:
            os.remove(upload_path)
        except OSError:
            pass
