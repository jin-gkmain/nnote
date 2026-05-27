import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { AdminUserManagementPanel } from "@/app/components/AdminUserManagementPanel";
import { ProfileSettingsForm } from "@/app/components/ProfileSettingsForm";
import { NurseVerificationSection } from "@/app/components/NurseVerificationSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { type AuthUser } from "@/app/data/auth-api";
import { InputAssistField } from "@/app/components/input-assist-field";
import { writeInputAssistSettingsCache } from "@/app/data/input-assist-api";
import { VOICE_RECORD_TEMPLATES, type VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";
import { ROUTES } from "@/app/navigation/routes";
import {
  useInputAssistSettingsQuery,
  useUpdateInputAssistSettingsMutation,
} from "@/app/query/use-app-query";

type InputAssistEntryRow = { id: string; trigger: string; replacement: string };

function newInputAssistRow(partial: { trigger?: string; replacement?: string } = {}): InputAssistEntryRow {
  return {
    id: crypto.randomUUID(),
    trigger: partial.trigger ?? "",
    replacement: partial.replacement ?? "",
  };
}

export default function SettingsPage() {
  const { user, token, isReady, refreshMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      navigate(ROUTES.login, { replace: true, state: { from: ROUTES.settings } });
    }
  }, [isReady, token, navigate]);

  if (!isReady || !token || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        세션 확인 중…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] min-w-0 flex-col gap-5 lg:max-w-none">
      <h1 className="text-[28px] font-bold leading-tight text-[#111827] sm:text-3xl">
        내정보
      </h1>
      <Tabs defaultValue="account" className="min-h-0 w-full flex-1 gap-4 overflow-hidden">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] p-1 sm:w-auto">
          <TabsTrigger
            value="account"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            내 계정
          </TabsTrigger>
          <TabsTrigger
            value="input-assist"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            자동완성/약어
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-0 min-h-0 overflow-y-auto overscroll-contain">
          <AccountSettingsSection user={user} token={token} onProfileSaved={() => void refreshMe()} />
        </TabsContent>
        <TabsContent value="input-assist" className="mt-0 min-h-0 overflow-y-auto overscroll-contain">
          <InputAssistSettingsSection token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InputAssistSettingsSection({ token }: { token: string }) {
  const settingsQuery = useInputAssistSettingsQuery(token);
  const updateMutation = useUpdateInputAssistSettingsMutation(token);
  const [enabled, setEnabled] = useState(true);
  const [entries, setEntries] = useState<InputAssistEntryRow[]>([]);
  const [message, setMessage] = useState("");
  const [testAssistText, setTestAssistText] = useState("");
  const [testTemplateId, setTestTemplateId] = useState<VoiceRecordTemplateId>(VOICE_RECORD_TEMPLATES[0]);
  const [testFieldKey, setTestFieldKey] = useState("situation");

  const inputAssistSettingsOverride = useMemo(
    () => ({
      enabled,
      entries: entries.map((e) => ({ trigger: e.trigger, replacement: e.replacement })),
    }),
    [enabled, entries],
  );

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabled(settingsQuery.data.enabled);
    setEntries(settingsQuery.data.entries.map((e) => newInputAssistRow({ trigger: e.trigger, replacement: e.replacement })));
  }, [settingsQuery.data]);

  function updateEntry(index: number, patch: Partial<{ trigger: string; replacement: string }>) {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function addEntry() {
    setEntries((prev) => [...prev, newInputAssistRow({ trigger: ".", replacement: "" })]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveSettings() {
    setMessage("");
    const trimmed = entries.map((entry) => ({
      trigger: entry.trigger.trim(),
      replacement: entry.replacement.trim(),
    }));
    const nonEmpty = trimmed.filter((entry) => entry.trigger.length > 0 || entry.replacement.length > 0);
    const normalized = nonEmpty.filter((entry) => entry.trigger.length > 1 && entry.replacement.length > 0);
    const triggerSet = new Set<string>();
    for (const entry of normalized) {
      if (!entry.trigger.startsWith(".")) {
        setMessage(`약어 "${entry.trigger}"는 점(.)으로 시작해야 합니다.`);
        return;
      }
      if (entry.trigger.length > 64) {
        setMessage(`약어 "${entry.trigger}"가 너무 깁니다. (최대 64자)`);
        return;
      }
      if (/\s/.test(entry.trigger)) {
        setMessage(`약어 "${entry.trigger}"에 공백이 포함되어 있습니다.`);
        return;
      }
      if (entry.replacement.length > 2000) {
        setMessage(`치환 문장이 너무 깁니다. (최대 2000자)`);
        return;
      }
      if (triggerSet.has(entry.trigger)) {
        setMessage(`약어 "${entry.trigger}"가 중복되었습니다.`);
        return;
      }
      triggerSet.add(entry.trigger);
    }
    try {
      await updateMutation.mutateAsync({ enabled, entries: normalized });
      writeInputAssistSettingsCache({ enabled, entries: normalized });
      setMessage("자동완성/약어 설정이 저장되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설정 저장에 실패했습니다.");
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">기록지 자동완성</p>
          <p className="mt-0.5 text-xs text-gray-500">
            입력 중 회색 제안을 보여주고 Tab으로 수락합니다.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          활성화
        </label>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50/90 p-4">
        <p className="text-sm font-semibold text-gray-900">동작 테스트</p>
        <p className="mt-1 text-xs text-gray-500">
          위에서 바꾼 활성화 여부·약어 사전이 저장하기 전에도 이 입력란에 그대로 적용됩니다. 회색 이어쓰기는 Tab으로 수락하고, 마지막
          단어가 약어와 일치하면 Enter로 치환됩니다. 서버 제안은 아래에서 고른 기록지·필드 키에 맞는 과거 기록을 참고합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            기록지 (record_type)
            <select
              value={testTemplateId}
              onChange={(e) => setTestTemplateId(e.target.value as VoiceRecordTemplateId)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
            >
              {VOICE_RECORD_TEMPLATES.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            필드 키
            <input
              type="text"
              value={testFieldKey}
              onChange={(e) => setTestFieldKey(e.target.value)}
              placeholder="예: situation"
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3">
          <InputAssistField
            templateId={testTemplateId}
            fieldKey={testFieldKey.trim() || "situation"}
            value={testAssistText}
            onChange={setTestAssistText}
            multiline
            rows={4}
            placeholder="두 글자 이상 입력하면 제안이 요청됩니다. 약어는 공백 뒤 토큰으로 입력한 뒤 Enter."
            className="min-h-[100px] w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            settingsOverride={inputAssistSettingsOverride}
          />
          <button
            type="button"
            onClick={() => setTestAssistText("")}
            className="mt-2 text-xs font-medium text-gray-600 underline decoration-gray-400 underline-offset-2 hover:text-gray-900"
          >
            입력 지우기
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">dot 약어 사전</p>
          <button
            type="button"
            onClick={addEntry}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
          >
            약어 추가
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          예: <code>.abg</code> 입력 후 Enter를 누르면 지정한 문장으로 치환됩니다.
        </p>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={entry.id} className="grid grid-cols-1 gap-2 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <input
                type="text"
                value={entry.trigger}
                onChange={(e) => updateEntry(index, { trigger: e.target.value })}
                className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                placeholder=".약어"
              />
              <input
                type="text"
                value={entry.replacement}
                onChange={(e) => updateEntry(index, { replacement: e.target.value })}
                className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                placeholder="치환 문장"
              />
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700"
              >
                삭제
              </button>
            </div>
          ))}
          {!entries.length ? (
            <p className="text-xs text-gray-500">등록된 약어가 없습니다.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={updateMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
    </div>
  );
}

function AccountSettingsSection({
  user,
  token,
  onProfileSaved,
}: {
  user: AuthUser;
  token: string;
  onProfileSaved: () => void;
}) {
  const isAdmin = user.role === "admin";
  return (
    <div className="space-y-8">
      <ProfileSettingsForm user={user} token={token} onProfileSaved={onProfileSaved} />
      {!isAdmin ? <NurseVerificationSection user={user} token={token} /> : null}
      {isAdmin ? <AdminUserManagementPanel token={token} actorUser={user} /> : null}
    </div>
  );
}
