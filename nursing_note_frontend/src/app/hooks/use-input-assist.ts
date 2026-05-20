import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/auth/auth-context";
import {
  useInputAssistSettingsQuery,
  useInputAutocompleteMutation,
} from "@/app/query/use-app-query";

interface UseInputAssistParams {
  templateId: string;
  fieldKey: string;
  currentText: string;
  patientId?: number | null;
  patientContext?: string;
  recentRecordContext?: string;
  disabled?: boolean;
  /** 설정 화면 등: 저장 전 편집 중인 활성화·약어로 미리 테스트할 때 전달 */
  settingsOverride?: { enabled: boolean; entries: { trigger: string; replacement: string }[] } | null;
}

interface UseInputAssistResult {
  ghostSuggestion: string;
  handleInputKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    onChangeValue: (nextValue: string) => void,
  ) => void;
}

export function useInputAssist(params: UseInputAssistParams): UseInputAssistResult {
  const { token } = useAuth();
  const settingsQuery = useInputAssistSettingsQuery(token);
  const autocompleteMutation = useInputAutocompleteMutation(token);
  const [ghostSuggestion, setGhostSuggestion] = useState("");
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef(false);

  const effectiveEnabled = useMemo(() => {
    if (params.settingsOverride != null) return params.settingsOverride.enabled;
    return settingsQuery.data?.enabled !== false;
  }, [params.settingsOverride, settingsQuery.data?.enabled]);

  const abbreviationMap = useMemo(() => {
    const map = new Map<string, string>();
    const list =
      params.settingsOverride != null
        ? params.settingsOverride.entries
        : (settingsQuery.data?.entries ?? []);
    for (const entry of list) {
      map.set(entry.trigger, entry.replacement);
    }
    return map;
  }, [params.settingsOverride, settingsQuery.data?.entries]);

  useEffect(() => {
    abortRef.current = false;
    if (params.disabled || !token || !effectiveEnabled) {
      setGhostSuggestion("");
      return;
    }
    const text = params.currentText.trim();
    if (text.length < 2) {
      setGhostSuggestion("");
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const result = await autocompleteMutation.mutateAsync({
          templateId: params.templateId,
          fieldKey: params.fieldKey,
          currentText: params.currentText,
          patientId: params.patientId ?? undefined,
          patientContext: params.patientContext,
          recentRecordContext: params.recentRecordContext,
        });
        if (abortRef.current) return;
        setGhostSuggestion(result.suggestion ?? "");
      } catch {
        if (!abortRef.current) setGhostSuggestion("");
      }
    }, 180);
    return () => {
      abortRef.current = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [
    autocompleteMutation,
    params.currentText,
    params.disabled,
    params.fieldKey,
    params.patientContext,
    params.patientId,
    params.recentRecordContext,
    params.templateId,
    effectiveEnabled,
    token,
  ]);

  function handleInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    onChangeValue: (nextValue: string) => void,
  ) {
    if ((event.nativeEvent as KeyboardEvent).isComposing) return;
    if (params.disabled || !effectiveEnabled) return;
    if (event.key === "Tab" && ghostSuggestion) {
      event.preventDefault();
      onChangeValue(`${value}${ghostSuggestion}`);
      setGhostSuggestion("");
      return;
    }
    if (event.key === "Enter" && event.shiftKey) return;
    if (event.key !== "Enter") return;
    const tokens = value.split(/\s+/);
    const last = tokens[tokens.length - 1] ?? "";
    const replacement = abbreviationMap.get(last);
    if (!replacement) return;
    event.preventDefault();
    tokens[tokens.length - 1] = replacement;
    onChangeValue(tokens.join(" "));
    setGhostSuggestion("");
  }

  return {
    ghostSuggestion,
    handleInputKeyDown,
  };
}
