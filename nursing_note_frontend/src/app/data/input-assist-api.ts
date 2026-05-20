import { authFetch } from "@/app/data/auth-api";

export const INPUT_ASSIST_SETTINGS_STORAGE_KEY = "nursing_note_input_assist_settings";

export interface InputAbbreviationEntry {
  trigger: string;
  replacement: string;
}

export function writeInputAssistSettingsCache(settings: InputAssistSettings): void {
  localStorage.setItem(INPUT_ASSIST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function readInputAssistSettingsCache(): InputAssistSettings | null {
  try {
    const raw = localStorage.getItem(INPUT_ASSIST_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InputAssistSettings;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) return null;
    return {
      enabled: parsed.enabled !== false,
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

export interface InputAssistSettings {
  enabled: boolean;
  entries: InputAbbreviationEntry[];
}

export interface AutocompleteRequestPayload {
  templateId: string;
  fieldKey: string;
  currentText: string;
  patientId?: number;
  patientContext?: string;
  recentRecordContext?: string;
}

export interface AutocompleteResponsePayload {
  suggestion: string | null;
  source: "qdrant" | "fallback";
  score: number;
  latencyMs: number;
}

export async function fetchMyInputAssistSettings(token: string): Promise<InputAssistSettings> {
  const res = await authFetch("/api/settings/abbreviations/me", token);
  const data = (await res.json().catch(() => ({}))) as Partial<InputAssistSettings> & {
    message?: string;
  };
  if (!res.ok) throw new Error(data.message || "자동완성/약어 설정을 불러오지 못했습니다.");
  return {
    enabled: data.enabled !== false,
    entries: Array.isArray(data.entries) ? data.entries : [],
  };
}

export async function updateMyInputAssistSettings(
  token: string,
  payload: InputAssistSettings,
): Promise<void> {
  const res = await authFetch("/api/settings/abbreviations/me", token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "자동완성/약어 설정 저장에 실패했습니다.");
  }
}

export async function requestInputAutocomplete(
  token: string,
  payload: AutocompleteRequestPayload,
): Promise<AutocompleteResponsePayload> {
  const res = await authFetch("/api/ai-search/autocomplete", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<AutocompleteResponsePayload> & {
    message?: string;
  };
  if (!res.ok) throw new Error(data.message || "자동완성 요청에 실패했습니다.");
  return {
    suggestion: typeof data.suggestion === "string" ? data.suggestion : null,
    source: data.source === "qdrant" ? "qdrant" : "fallback",
    score: Number(data.score ?? 0),
    latencyMs: Number(data.latencyMs ?? 0),
  };
}
