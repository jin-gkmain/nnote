const STORAGE_KEY = "nursing-preferred-stt-engine";

/** STT provider는 백엔드의 STT_PROVIDER 설정을 따릅니다. */
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
