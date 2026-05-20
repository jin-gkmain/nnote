import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { AdminUserManagementPanel } from "@/app/components/AdminUserManagementPanel";
import { ProfileSettingsForm } from "@/app/components/ProfileSettingsForm";
import { NurseVerificationSection } from "@/app/components/NurseVerificationSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { type AuthUser } from "@/app/data/auth-api";
import { InputAssistField } from "@/app/components/input-assist-field";
import { TemplateFieldControl } from "@/app/components/template-field-control";
import {
  isChoiceTemplateValueType,
  splitTemplateLabel,
  type TemplateFieldEffective,
  type TemplateInputKind,
  type TemplateUiFieldConfig,
} from "@/app/data/template-field-registry";
import { writeInputAssistSettingsCache } from "@/app/data/input-assist-api";
import {
  isBuiltinLockedVoiceTemplate,
  VOICE_RECORD_TEMPLATES,
  type VoiceRecordTemplateId,
} from "@/app/data/voiceRecordTemplates";
import { ROUTES } from "@/app/navigation/routes";
import { useMergedTemplateFieldsQuery, usePutTemplateUiMutation } from "@/app/query/use-app-query";
import { useTemplatesMapQuery } from "@/app/query/use-app-query";
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

function effectiveToConfig(rows: TemplateFieldEffective[]): TemplateUiFieldConfig[] {
  return rows.map((r) => ({
    storageKey: r.storageKey,
    label: r.label,
    hidden: r.hidden,
    inputKind: r.inputKind,
    unit: r.unit,
    fullRow: r.fullRow,
    ...(r.options !== undefined ? { options: { ...r.options } } : {}),
  }));
}

/** 미리보기용: 짧은 입력 최대 3열까지 묶는 행 그룹 */
function buildPreviewRowGroups(visibleFields: TemplateUiFieldConfig[]): TemplateUiFieldConfig[][] {
  const rows: TemplateUiFieldConfig[][] = [];
  let shortBuffer: TemplateUiFieldConfig[] = [];
  for (const field of visibleFields) {
    const isShort =
      field.inputKind === "text_short" ||
      field.inputKind === "number" ||
      field.inputKind === "date" ||
      field.inputKind === "boolean" ||
      field.inputKind === "radio" ||
      field.inputKind === "checkbox" ||
      field.inputKind === "selectbox";
    const forceFullRow = isShort && Boolean(field.fullRow);
    if (!isShort || forceFullRow) {
      if (shortBuffer.length) {
        rows.push(shortBuffer);
        shortBuffer = [];
      }
      rows.push([field]);
      continue;
    }
    shortBuffer.push(field);
    if (shortBuffer.length === 3) {
      rows.push(shortBuffer);
      shortBuffer = [];
    }
  }
  if (shortBuffer.length) rows.push(shortBuffer);
  return rows;
}

/** `fields` 순서를 유지하며 라벨의 대주제(`splitTemplateLabel`)별로 묶기 */
function groupFieldsBySectionLabel(
  fields: TemplateUiFieldConfig[],
  opts?: { omitHidden?: boolean },
): { section: string; fields: TemplateUiFieldConfig[] }[] {
  const list = opts?.omitHidden ? fields.filter((f) => !f.hidden) : fields;
  const sectionToFields = new Map<string, TemplateUiFieldConfig[]>();
  const sectionOrder: string[] = [];
  for (const field of list) {
    const { section } = splitTemplateLabel(field.label);
    if (!sectionToFields.has(section)) {
      sectionToFields.set(section, []);
      sectionOrder.push(section);
    }
    sectionToFields.get(section)!.push(field);
  }
  return sectionOrder.map((section) => ({
    section,
    fields: sectionToFields.get(section) ?? [],
  }));
}

/** 미리보기: 숨김 필드 제외 */
function buildSectionBlocks(fields: TemplateUiFieldConfig[]): { section: string; fields: TemplateUiFieldConfig[] }[] {
  return groupFieldsBySectionLabel(fields, { omitHidden: true });
}

/** 같은 대주제에 속한 행들의 전역 인덱스만 재배열. 섹션이 다르면 null */
function reorderFieldsWithinSameSection(
  fields: TemplateUiFieldConfig[],
  oldIndex: number,
  newIndex: number,
): TemplateUiFieldConfig[] | null {
  const moved = fields[oldIndex];
  const target = fields[newIndex];
  if (!moved || !target) return null;
  const section = splitTemplateLabel(moved.label).section;
  if (splitTemplateLabel(target.label).section !== section) return null;

  const indices: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    if (splitTemplateLabel(fields[i]!.label).section === section) {
      indices.push(i);
    }
  }
  const localOld = indices.indexOf(oldIndex);
  const localNew = indices.indexOf(newIndex);
  if (localOld < 0 || localNew < 0) return null;

  const slice = indices.map((i) => fields[i]!);
  const reordered = arrayMove(slice, localOld, localNew);
  const next = [...fields];
  indices.forEach((globalIdx, k) => {
    next[globalIdx] = reordered[k]!;
  });
  return next;
}

interface SortableTemplateFieldRowProps {
  field: TemplateUiFieldConfig;
  index: number;
  isAdmin: boolean;
  /** 시스템 기본 양식: 필드 옵션·순서 변경 불가 */
  readOnlySettings?: boolean;
  updateField: (index: number, patch: Partial<TemplateUiFieldConfig>) => void;
}

function SortableTemplateFieldRow({
  field,
  index,
  isAdmin,
  readOnlySettings = false,
  updateField,
}: SortableTemplateFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.storageKey,
    disabled: !isAdmin || readOnlySettings,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: isDragging ? undefined : transition }}
      className={`rounded-lg border p-3 transition-colors duration-100 ${
        isDragging ? "border-blue-400 bg-blue-50/70 shadow-sm" : "border-gray-100 bg-gray-50/80"
      } ${isAdmin && !readOnlySettings ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_minmax(0,1fr)_11rem_8rem_auto] lg:items-center lg:gap-3">
        {isAdmin && !readOnlySettings ? (
          <button
            type="button"
            className="flex items-center justify-center text-gray-400"
            aria-label="순서 이동"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        ) : (
          <span className="hidden w-5 lg:block" aria-hidden />
        )}
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{field.storageKey}</span>
          </div>
          <input
            type="text"
            value={field.label}
            readOnly
            title="대주제·소주제 이름은 관리자 템플릿(JSON)에서만 변경할 수 있습니다."
            className="h-9 w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm font-medium text-gray-800"
          />
        </div>
        <>
          <select
            value={field.inputKind}
            disabled={readOnlySettings}
            onChange={(e) => {
              const next = e.target.value as TemplateInputKind;
              if (isChoiceTemplateValueType(next)) {
                const keep =
                  field.options && Object.keys(field.options).length > 0 ? field.options : { 옵션1: "" };
                updateField(index, { inputKind: next, options: { ...keep } });
              } else {
                updateField(index, { inputKind: next, options: undefined });
              }
            }}
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="text_long">긴 텍스트 (여러 줄)</option>
            <option value="text_short">짧은 텍스트 (한 줄)</option>
            <option value="number">숫자</option>
            <option value="date">날짜</option>
            <option value="boolean">예/아니오/공백</option>
            <option value="radio">라디오</option>
            <option value="checkbox">체크박스(다중)</option>
            <option value="selectbox">선택 상자</option>
          </select>
          <input
            type="text"
            value={field.unit ?? ""}
            placeholder="단위"
            disabled={readOnlySettings}
            onChange={(e) => updateField(index, { unit: e.target.value })}
            className="h-9 rounded-md border border-gray-200 px-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-gray-600 lg:justify-start">
            {(field.inputKind === "text_short" ||
              field.inputKind === "number" ||
              field.inputKind === "date" ||
              field.inputKind === "boolean" ||
              field.inputKind === "radio" ||
              field.inputKind === "checkbox" ||
              field.inputKind === "selectbox") ? (
              <label className={`flex items-center gap-1.5 ${readOnlySettings ? "cursor-not-allowed opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  disabled={readOnlySettings}
                  checked={Boolean(field.fullRow)}
                  onChange={(e) => updateField(index, { fullRow: e.target.checked })}
                />
                한 줄 전체 사용
              </label>
            ) : null}
            <label className={`flex items-center gap-1.5 ${readOnlySettings ? "cursor-not-allowed opacity-60" : ""}`}>
              <input
                type="checkbox"
                disabled={readOnlySettings}
                checked={field.hidden}
                onChange={(e) => updateField(index, { hidden: e.target.checked })}
              />
              숨김
            </label>
          </div>
        </>
      </div>
      {isChoiceTemplateValueType(field.inputKind) ? (
        <div className="mt-2 rounded-md border border-gray-200 bg-white px-2 py-2">
          <p className="mb-1 text-xs text-gray-500">
            options JSON은 관리자 템플릿 화면에서 편집하는 것을 권장합니다. 현재 값:
          </p>
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-gray-800">
            {JSON.stringify(field.options ?? {}, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

/** 설정 편집·미리보기 공통: 대주제(영역) 카드 래퍼 */
function TemplateSectionRegion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-3 shadow-sm">
      <p className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-900">{title}</p>
      {children}
    </div>
  );
}

function TemplatePreviewCanvas({
  templateId,
  fields,
}: {
  templateId: VoiceRecordTemplateId;
  fields: TemplateUiFieldConfig[];
}) {
  const sectionBlocks = useMemo(() => buildSectionBlocks(fields), [fields]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800">{templateId} 미리보기</p>
      <p className="mt-1 text-xs text-gray-500">
        대주제별로 묶어 실제 입력 화면과 비슷하게 보여줍니다. 이름은 변경할 수 없습니다.
      </p>
      <div className="mt-4 space-y-4">
        {sectionBlocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            표시되는 항목이 없습니다.
          </div>
        ) : (
          sectionBlocks.map(({ section, fields: sectionFields }) => {
            const previewRows = buildPreviewRowGroups(sectionFields);
            return (
              <TemplateSectionRegion key={section} title={section}>
                <div className="space-y-3">
                  {previewRows.map((row, rowIndex) => (
                    <div
                      key={`${section}-row-${rowIndex}`}
                      className={`grid gap-3 ${
                        row.length === 3
                          ? "grid-cols-1 xl:grid-cols-3"
                          : row.length === 2
                            ? "grid-cols-1 xl:grid-cols-2"
                            : "grid-cols-1"
                      }`}
                    >
                      {row.map((field) => {
                        const unit = field.unit?.trim() ? ` (${field.unit.trim()})` : "";
                        const { field: fieldTitle } = splitTemplateLabel(field.label);
                        const eff: TemplateFieldEffective = {
                          storageKey: field.storageKey,
                          label: field.label,
                          inputKind: field.inputKind,
                          unit: field.unit,
                          fullRow: field.fullRow,
                          hidden: field.hidden,
                          ...(field.options !== undefined ? { options: { ...field.options } } : {}),
                        };
                        return (
                          <div
                            key={field.storageKey}
                            className="rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <label className="mb-1.5 block text-xs font-medium text-gray-700">
                              {fieldTitle}
                              {unit}
                            </label>
                            <TemplateFieldControl
                              field={eff}
                              templateId={templateId}
                              value=""
                              onChange={() => {}}
                              readOnly
                              classNameInputShort="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                              classNameTextarea="min-h-[88px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TemplateSectionRegion>
            );
          })
        )}
      </div>
    </div>
  );
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
    <div className="flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">설정</h1>
      <Tabs defaultValue="template" className="w-full gap-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
          <TabsTrigger
            value="template"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            템플릿
          </TabsTrigger>
          <TabsTrigger
            value="input-assist"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            자동완성/약어
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            계정
          </TabsTrigger>
        </TabsList>
        <TabsContent value="template" className="mt-0">
          <TemplateSettingsSection user={user} token={token} />
        </TabsContent>
        <TabsContent value="input-assist" className="mt-0">
          <InputAssistSettingsSection token={token} />
        </TabsContent>
        <TabsContent value="account" className="mt-0">
          <AccountSettingsSection user={user} token={token} onProfileSaved={() => void refreshMe()} />
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

export function TemplateSettingsSection({
  user,
  token,
}: {
  user: AuthUser;
  token: string;
}) {
  const isAdmin = user.role === "admin";
  const [templateId, setTemplateId] = useState<VoiceRecordTemplateId>(VOICE_RECORD_TEMPLATES[0]);
  const [draftFields, setDraftFields] = useState<TemplateUiFieldConfig[]>([]);
  const [baselineJson, setBaselineJson] = useState<string>("");
  const [message, setMessage] = useState("");
  const [activeDragFieldKey, setActiveDragFieldKey] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 1 } }));
  const templatesMapQuery = useTemplatesMapQuery();
  const templateFieldsQuery = useMergedTemplateFieldsQuery(templateId);
  const templateOptions = useMemo(() => {
    const ids = Object.keys(templatesMapQuery.data ?? {});
    if (templatesMapQuery.isSuccess && ids.length === 0) return [];
    return ids.length > 0 ? ids : [...VOICE_RECORD_TEMPLATES];
  }, [templatesMapQuery.data, templatesMapQuery.isSuccess]);
  const templateLocked = isBuiltinLockedVoiceTemplate(templateId);

  const putTemplateMutation = usePutTemplateUiMutation(token);

  useEffect(() => {
    if (!templateFieldsQuery.data) return;
    setMessage("");
    const cfg = effectiveToConfig(templateFieldsQuery.data);
    setDraftFields(cfg);
    setBaselineJson(JSON.stringify(cfg));
  }, [templateFieldsQuery.data]);

  const dirty = baselineJson !== JSON.stringify(draftFields);
  const loading = templateFieldsQuery.isLoading;
  const saving = putTemplateMutation.isPending;

  async function handleSave() {
    setMessage("");
    if (templateLocked) {
      setMessage("시스템 기본 양식(SOAP·SOAPIE·SBAR)은 설정에서 수정할 수 없습니다.");
      return;
    }
    try {
      await putTemplateMutation.mutateAsync({ templateId, fields: draftFields });
      setBaselineJson(JSON.stringify(draftFields));
      setMessage("저장되었습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }

  function handleCancel() {
    try {
      const parsed = JSON.parse(baselineJson) as TemplateUiFieldConfig[];
      setDraftFields(parsed);
      setMessage("");
    } catch {
      templateFieldsQuery.refetch().catch(() => undefined);
    }
  }

  function updateField(index: number, patch: Partial<TemplateUiFieldConfig>) {
    setDraftFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  const reorderSectionOnlyMessage = "같은 대주제 안에서만 순서를 바꿀 수 있습니다.";

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragFieldKey(null);
    if (!isAdmin || templateLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    let reorderBlocked = false;
    setDraftFields((prev) => {
      const oldIndex = prev.findIndex((item) => item.storageKey === active.id);
      const newIndex = prev.findIndex((item) => item.storageKey === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = reorderFieldsWithinSameSection(prev, oldIndex, newIndex);
      if (!next) {
        reorderBlocked = true;
        return prev;
      }
      return next;
    });
    if (reorderBlocked) {
      setMessage(reorderSectionOnlyMessage);
    } else {
      setMessage((prev) => (prev === reorderSectionOnlyMessage ? "" : prev));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (!isAdmin || templateLocked) return;
    setActiveDragFieldKey(String(event.active.id));
  }

  const activeDragField = useMemo(
    () => draftFields.find((field) => field.storageKey === activeDragFieldKey) ?? null,
    [activeDragFieldKey, draftFields],
  );

  const editorSectionBlocks = useMemo(
    () => groupFieldsBySectionLabel(draftFields),
    [draftFields],
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-800">기록지 템플릿</p>
          <p className="mt-0.5 text-xs text-gray-500">
            이름(대주제·소주제)은 관리자 템플릿에서만 바꿀 수 있습니다. 입력 종류·단위·숨김은 여기서 저장하면 전역 JSON에 반영됩니다. 항목
            순서는 같은 대주제 안에서만 바꿀 수 있으며, 드래그는 관리자만 사용할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!dirty || saving || templateLocked}
            onClick={handleCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!dirty || saving || templateLocked}
            onClick={() => void handleSave()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      <select
        value={templateId}
        disabled={dirty}
        onChange={(e) => setTemplateId(e.target.value as VoiceRecordTemplateId)}
        className="mb-6 h-10 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-50"
      >
        {templateOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {templateLocked ? (
        <p className="mb-4 text-xs text-gray-600">
          SOAP·SOAPIE·SBAR는 시스템 기본 양식입니다. 목록에는 표시되며 기록 작성에 사용할 수 있으나, 필드 설정 변경은 할 수 없습니다.
        </p>
      ) : null}
      {dirty ? (
        <p className="mb-4 text-xs text-amber-700">
          변경 중입니다. 다른 템플릿으로 바꾸려면 먼저 저장하거나 취소하세요.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
          <div className="min-h-0 space-y-4 xl:col-span-7">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDragFieldKey(null)}
            >
              {editorSectionBlocks.map(({ section, fields: sectionFields }) => (
                <TemplateSectionRegion key={section} title={section}>
                  <div className="space-y-2">
                    <SortableContext
                      items={sectionFields.map((field) => field.storageKey)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sectionFields.map((field) => {
                        const globalIndex = draftFields.findIndex((f) => f.storageKey === field.storageKey);
                        if (globalIndex < 0) return null;
                        return (
                          <SortableTemplateFieldRow
                            key={field.storageKey}
                            field={field}
                            index={globalIndex}
                            isAdmin={isAdmin}
                            readOnlySettings={templateLocked}
                            updateField={updateField}
                          />
                        );
                      })}
                    </SortableContext>
                  </div>
                </TemplateSectionRegion>
              ))}
              <DragOverlay dropAnimation={null}>
                {activeDragField ? (
                  <div className="min-w-[220px] rounded-lg border border-blue-300 bg-white p-3 shadow-2xl">
                    <p className="text-xs text-blue-600">항목 이동</p>
                    <p className="truncate text-sm font-semibold text-gray-900">{activeDragField.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{activeDragField.storageKey}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className="xl:col-span-3">
            <div className="sticky top-4 space-y-3">
              <TemplatePreviewCanvas templateId={templateId} fields={draftFields} />
            </div>
          </div>
        </div>
      )}
      {message ? (
        <p className="mt-4 text-sm text-gray-700" role="status">
          {message}
        </p>
      ) : null}
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
