import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { ProfileSettingsForm } from "@/app/components/ProfileSettingsForm";
import { NurseVerificationSection } from "@/app/components/NurseVerificationSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { type AuthUser } from "@/app/data/auth-api";
import { InputAssistField } from "@/app/components/input-assist-field";
import { writeInputAssistSettingsCache } from "@/app/data/input-assist-api";
import type { VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";
import { ROUTES } from "@/app/navigation/routes";
import {
  useInputAssistSettingsQuery,
  useTemplatesMapQuery,
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
      <Tabs defaultValue="account" className="w-full gap-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] p-1 sm:w-auto">
          <TabsTrigger
            value="account"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            계정
          </TabsTrigger>
          <TabsTrigger
            value="input-assist"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            단축어
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-0 min-w-0">
          <AccountSettingsSection
            user={user}
            token={token}
            onProfileSaved={() => void refreshMe()}
            onEnterAdminMode={() => navigate(ROUTES.adminRoot)}
          />
        </TabsContent>
        <TabsContent value="input-assist" className="mt-0 min-w-0">
          <InputAssistSettingsSection token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InputAssistSettingsSection({ token }: { token: string }) {
  const settingsQuery = useInputAssistSettingsQuery(token);
  const templatesQuery = useTemplatesMapQuery();
  const updateMutation = useUpdateInputAssistSettingsMutation(token);
  const [enabled, setEnabled] = useState(true);
  const [entries, setEntries] = useState<InputAssistEntryRow[]>([]);
  const [message, setMessage] = useState("");
  const [testAssistText, setTestAssistText] = useState("");
  const [testTemplateId, setTestTemplateId] = useState<VoiceRecordTemplateId>("");
  const [testFieldKey, setTestFieldKey] = useState("");
  const templateIds = useMemo(
    () => Object.keys(templatesQuery.data ?? {}),
    [templatesQuery.data],
  );
  const testFieldOptions = useMemo(() => {
    if (!testTemplateId) return [];
    const sections = templatesQuery.data?.[testTemplateId]?.sections ?? {};
    const options = Object.entries(sections).flatMap(([section, fields]) =>
      Object.entries(fields).map(([fieldKey, field]) => ({
        fieldKey,
        baseLabel: `${section} · ${field.label || fieldKey}`,
      })),
    );
    const labelCounts = new Map<string, number>();
    for (const option of options) {
      labelCounts.set(option.baseLabel, (labelCounts.get(option.baseLabel) ?? 0) + 1);
    }
    return options.map(({ fieldKey, baseLabel }) => ({
      fieldKey,
      label:
        (labelCounts.get(baseLabel) ?? 0) > 1
          ? `${baseLabel} · ${fieldKey}`
          : baseLabel,
    }));
  }, [templatesQuery.data, testTemplateId]);

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

  useEffect(() => {
    if (templateIds.length === 0) {
      setTestTemplateId("");
      return;
    }
    setTestTemplateId((previous) =>
      previous && templateIds.includes(previous) ? previous : templateIds[0]!,
    );
  }, [templateIds]);

  useEffect(() => {
    if (testFieldOptions.length === 0) {
      setTestFieldKey("");
      return;
    }
    setTestFieldKey((previous) =>
      previous && testFieldOptions.some((option) => option.fieldKey === previous)
        ? previous
        : testFieldOptions[0]!.fieldKey,
    );
  }, [testFieldOptions]);

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
      setMessage("단축어 설정이 저장되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설정 저장에 실패했습니다.");
    }
  }

  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">단축어 설정</p>
          <p className="mt-0.5 text-xs text-gray-500">
            기록지 입력 중 단축어를 치환하고, 필요한 경우 회색 제안을 Tab으로 수락합니다.
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
          위에서 바꾼 활성화 여부·단축어 사전이 저장하기 전에도 이 입력란에 그대로 적용됩니다. 회색 이어쓰기는 Tab으로 수락하고, 마지막
          단어가 단축어와 일치하면 Enter로 치환됩니다. 서버 제안은 아래에서 고른 기록지·필드 키에 맞는 과거 기록을 참고합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            기록지 (record_type)
            <select
              value={testTemplateId}
              onChange={(e) => setTestTemplateId(e.target.value as VoiceRecordTemplateId)}
              disabled={templatesQuery.isLoading || templateIds.length === 0}
              className="h-9 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-sm"
            >
              {templateIds.map((id) => (
                <option key={id} value={id}>
                  {templatesQuery.data?.[id]?.displayTitle || id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            필드 키
            <select
              value={testFieldKey}
              onChange={(e) => setTestFieldKey(e.target.value)}
              disabled={testFieldOptions.length === 0}
              className="h-9 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-sm"
            >
              {testFieldOptions.map((option) => (
                <option key={option.fieldKey} value={option.fieldKey}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {templatesQuery.error ? (
          <p className="mt-3 text-xs text-red-600">
            {templatesQuery.error instanceof Error
              ? templatesQuery.error.message
              : "템플릿을 불러오지 못했습니다."}
          </p>
        ) : null}
        <div className="mt-3">
          {testTemplateId && testFieldKey ? (
            <InputAssistField
              templateId={testTemplateId}
              fieldKey={testFieldKey}
              value={testAssistText}
              onChange={setTestAssistText}
              multiline
              rows={4}
              placeholder="두 글자 이상 입력하면 제안이 요청됩니다. 약어는 공백 뒤 토큰으로 입력한 뒤 Enter."
              className="min-h-[100px] w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              settingsOverride={inputAssistSettingsOverride}
            />
          ) : (
            <div className="flex min-h-[100px] items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-center text-sm text-gray-500">
              테스트할 기록지와 필드를 불러오지 못했습니다.
            </div>
          )}
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
          <p className="text-sm font-semibold text-gray-900">단축어 사전</p>
          <button
            type="button"
            onClick={addEntry}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
          >
            단축어 추가
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          예: <code>.abg</code> 입력 후 Enter를 누르면 지정한 문장으로 치환됩니다.
        </p>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={entry.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <input
                type="text"
                value={entry.trigger}
                onChange={(e) => updateEntry(index, { trigger: e.target.value })}
                className="h-10 min-w-0 rounded-md border border-gray-300 px-3 text-sm"
                placeholder=".단축어"
              />
              <input
                type="text"
                value={entry.replacement}
                onChange={(e) => updateEntry(index, { replacement: e.target.value })}
                className="h-10 min-w-0 rounded-md border border-gray-300 px-3 text-sm"
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
            <p className="text-xs text-gray-500">등록된 단축어가 없습니다.</p>
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
  onEnterAdminMode,
}: {
  user: AuthUser;
  token: string;
  onProfileSaved: () => void;
  onEnterAdminMode: () => void;
}) {
  const isAdmin = user.role === "admin";
  return (
    <div className="space-y-8">
      <ProfileSettingsForm user={user} token={token} onProfileSaved={onProfileSaved} />
      {isAdmin ? (
        <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">관리자 권한</h2>
              <p className="mt-1 text-xs text-gray-600">
                관리자 계정은 이곳에서 어드민 모드로 전환할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onEnterAdminMode}
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              어드민 모드로 전환
            </button>
          </div>
        </section>
      ) : null}
      {!isAdmin ? <NurseVerificationSection user={user} token={token} /> : null}
    </div>
  );
}
