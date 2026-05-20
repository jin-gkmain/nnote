const STORAGE_KEY = "nursing-preferred-stt-engine";

/** STT는 WhisperX만 사용합니다. */
export type SttEngineChoice = "whisperx";

export function getPreferredSttEngine(): SttEngineChoice {
  try {
    // 과거 STT 엔진 선택 로컬 저장값 제거
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return "whisperx";
}
