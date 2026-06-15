import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { useAuth } from "@/app/auth/auth-context"
import {
  isChoiceTemplateValueType,
  isValidRawTemplateValueType,
  normalizeStoredTemplateValueType,
  normalizeTemplateFieldOptions,
  optionsObjectFromOptionDetails,
  type TemplateColumnDef,
  type TemplateFieldOption,
  type TemplateSectionMap,
  type TemplateSectionPreset,
  type TemplateValueType,
} from "@/app/data/template-field-registry"
import {
  BUILTIN_LOCKED_VOICE_TEMPLATE_IDS,
  isBuiltinLockedVoiceTemplate,
  type VoiceRecordTemplateId,
} from "@/app/data/voiceRecordTemplates"
import {
  useCreateTemplateUiMutation,
  useDeleteTemplateUiMutation,
  usePutTemplateUiMutation,
  useTemplatePresetsQuery,
  useTemplatesMapQuery,
} from "@/app/query/use-app-query"

type PresetCategory = "common" | "patient" | "extra"

interface TemplateColumnDraft {
  id: string
  fieldKey: string
  name: string
  description: string
  aiHint: string
  valueType: TemplateValueType
  hidden: boolean
  options: TemplateFieldOption[]
  conditions: TemplateColumnDef["conditions"]
  inputSources: string[]
  sourceRow?: number
  sourceDefinition?: string
}

interface TemplateSectionDraft {
  id: string
  name: string
  columns: TemplateColumnDraft[]
}

interface ActiveDragPreview {
  kind: "section" | "column"
  title: string
  valueType?: TemplateValueType
}

const VALUE_TYPE_OPTIONS: TemplateValueType[] = [
  "text_long",
  "text_short",
  "number",
  "date",
  "datetime",
  "boolean",
  "single_select",
  "multi_select",
  "computed",
  "image",
  "section_note",
]
/** 템플릿 추가 모달 기본값: 일반 필드는 options에 `{}`, choice 타입은 최소 1개 키 필요 */
const DEFAULT_NEW_TEMPLATE_JSON = "{}"
const CATEGORY_TABS: Array<{ id: PresetCategory; label: string }> = [
  { id: "common", label: "문서공통정보" },
  { id: "patient", label: "환자정보" },
  { id: "extra", label: "추가정보" },
]
const DEFAULT_COLUMNS_SECTION_NAME = "기본 칼럼"

function createUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultOption(index: number): TemplateFieldOption {
  return {
    optionKey: `옵션${index}`,
    label: `옵션${index}`,
    allowFreeText: false,
    displayOrder: index,
  }
}

function normalizeDraftOptions(column: TemplateColumnDraft): TemplateFieldOption[] {
  const normalized = normalizeTemplateFieldOptions(column.options, undefined)
  return normalized.length > 0 ? normalized : [defaultOption(1)]
}

function formatDateLabel(iso: string | null): string {
  if (!iso) return "-"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function sectionsForAdminOverlay(
  _templateId: VoiceRecordTemplateId,
  serverSections: TemplateSectionMap | null | undefined,
): TemplateSectionMap {
  if (serverSections && Object.keys(serverSections).length > 0) {
    return serverSections
  }
  return {}
}

function toDraftSections(map: TemplateSectionMap): TemplateSectionDraft[] {
  return Object.entries(map).map(([name, columns]) => ({
    id: createUid("section"),
    name,
    columns: Object.entries(columns).map(([columnName, def]) => ({
      id: createUid("column"),
      fieldKey: columnName,
      name: def?.label ?? columnName,
      description: def?.description ?? "",
      aiHint: def?.aiHint ?? "",
      valueType: normalizeStoredTemplateValueType(String(def?.type ?? "text_long")),
      hidden: false,
      options: normalizeTemplateFieldOptions(def?.optionDetails, def?.options),
      conditions: def?.conditions ?? [],
      inputSources: def?.inputSources ?? [],
      sourceRow: def?.sourceRow,
      sourceDefinition: def?.sourceDefinition,
    })),
  }))
}

function toSectionMap(sections: TemplateSectionDraft[]): TemplateSectionMap {
  const out: TemplateSectionMap = {}
  for (const section of sections) {
    const sectionName = section.name.trim()
    if (!sectionName) continue
    const columns: Record<string, TemplateColumnDef> = {}
    for (const column of section.columns) {
      if (column.hidden) continue
      const columnName = column.name.trim()
      if (!columnName) continue
      const def: TemplateColumnDef = { type: column.valueType }
      def.label = columnName
      const description = column.description.trim()
      if (description) def.description = description
      const aiHint = column.aiHint.trim()
      if (aiHint) def.aiHint = aiHint
      if (column.inputSources.length) def.inputSources = [...column.inputSources]
      if (column.sourceRow !== undefined) def.sourceRow = column.sourceRow
      if (column.sourceDefinition) def.sourceDefinition = column.sourceDefinition
      if (column.conditions?.length) def.conditions = [...column.conditions]
      if (isChoiceTemplateValueType(column.valueType)) {
        const opts = normalizeDraftOptions(column)
        if (opts.some((option) => !option.optionKey.trim())) {
          throw new Error(`소주제 "${columnName}"의 선택값은 비어 있을 수 없습니다.`)
        }
        def.optionDetails = opts
        def.options = optionsObjectFromOptionDetails(opts)
      }
      columns[column.fieldKey || createUid("field")] = def
    }
    if (Object.keys(columns).length > 0) out[sectionName] = columns
  }
  return out
}

function hasEmptySection(sections: TemplateSectionDraft[]): boolean {
  return sections.some((section) => !section.name.trim() || !section.columns.length || section.columns.every((column) => !column.name.trim()))
}

function mergePreset(current: TemplateSectionDraft[], preset: TemplateSectionPreset): TemplateSectionDraft[] {
  const merged = toSectionMap(current)
  for (const [sectionName, columns] of Object.entries(preset.sections))
    merged[sectionName] = { ...(merged[sectionName] ?? {}), ...columns }
  return toDraftSections(merged)
}

function sectionDndId(id: string): string { return `section:${id}` }
function columnDndId(id: string): string { return `column:${id}` }
function parseSectionDndId(id: string): string | null { return id.startsWith("section:") ? id.slice(8) : null }
function parseColumnDndId(id: string): string | null { return id.startsWith("column:") ? id.slice(7) : null }

function SortableColumnRow({
  section,
  column,
  isEditing,
  updateColumnName,
  updateColumnDescription,
  updateColumnAiHint,
  updateColumnType,
  updateColumnOptions,
  updateColumnHidden,
  removeColumn,
}: {
  section: TemplateSectionDraft
  column: TemplateColumnDraft
  isEditing: boolean
  updateColumnName: (sectionId: string, columnId: string, value: string) => void
  updateColumnDescription: (sectionId: string, columnId: string, value: string) => void
  updateColumnAiHint: (sectionId: string, columnId: string, value: string) => void
  updateColumnType: (sectionId: string, columnId: string, value: TemplateValueType) => void
  updateColumnOptions: (sectionId: string, columnId: string, value: TemplateFieldOption[]) => void
  updateColumnHidden: (sectionId: string, columnId: string, hidden: boolean) => void
  removeColumn: (sectionId: string, columnId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnDndId(column.id),
    disabled: !isEditing,
  })
  const options = normalizeDraftOptions(column)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 ${isDragging ? "scale-[0.99] opacity-60" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
      {isEditing ? <button type="button" className="text-gray-400" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button> : null}
      {isEditing ? (
        <input type="text" value={column.name} onChange={(event) => updateColumnName(section.id, column.id, event.target.value)} className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm" />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{column.name}</p>
          {column.description.trim() ? (
            <p className="truncate text-xs text-gray-500">{column.description}</p>
          ) : null}
        </div>
      )}
      {isEditing ? (
        <>
          <input
            type="text"
            value={column.description}
            onChange={(event) =>
              updateColumnDescription(section.id, column.id, event.target.value)
            }
            placeholder="설명(선택): AI가 필드 의미를 더 잘 이해합니다"
            maxLength={500}
            className="min-w-[240px] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
          />
          <select
            value={column.valueType}
            onChange={(event) =>
              updateColumnType(section.id, column.id, event.target.value as TemplateValueType)
            }
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            {VALUE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={column.hidden}
              onChange={(event) =>
                updateColumnHidden(section.id, column.id, event.target.checked)
              }
            />
            숨김
          </label>
          <button
            type="button"
            onClick={() => removeColumn(section.id, column.id)}
            className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
            aria-label="소주제 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <span className="rounded-md bg-gray-200 px-2 py-1 text-xs">{column.valueType}</span>
          {column.hidden ? (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">숨김</span>
          ) : null}
          {isChoiceTemplateValueType(column.valueType) ? (
            options.length === 0 ? (
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800">선택지 없음</span>
            ) : (
              <span
                className="max-w-[min(28rem,calc(100%-1rem))] truncate text-xs text-gray-500"
                title={`선택지: ${options.map((option) => option.optionKey).join(", ")}`}
              >
                선택지: {options.map((option) => option.label || option.optionKey).join(", ")}
              </span>
            )
          ) : null}
        </>
      )}
      </div>
      {isEditing && isChoiceTemplateValueType(column.valueType) ? (
        <div className="min-w-0 space-y-2 pl-0 sm:pl-8">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">선택지</p>
            <button
              type="button"
              onClick={() => updateColumnOptions(section.id, column.id, [...options, defaultOption(options.length + 1)])}
              className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              + 선택지 추가
            </button>
          </div>
          {options.map((option, optionIndex) => (
            <div key={`${option.displayOrder}-${option.optionKey}`} className="grid grid-cols-1 gap-2 rounded-md border border-gray-100 bg-white p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
              <label className="block text-xs text-gray-600">
                선택값
                <input
                  type="text"
                  value={option.optionKey}
                  onChange={(event) => {
                    const next = [...options]
                    next[optionIndex] = {
                      ...option,
                      optionKey: event.target.value,
                      label: option.label === option.optionKey ? event.target.value : option.label,
                    }
                    updateColumnOptions(section.id, column.id, next)
                  }}
                  className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                />
              </label>
              <label className="block text-xs text-gray-600">
                표시 라벨
                <input
                  type="text"
                  value={option.label}
                  onChange={(event) => {
                    const next = [...options]
                    next[optionIndex] = { ...option, label: event.target.value }
                    updateColumnOptions(section.id, column.id, next)
                  }}
                  className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-xs"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={option.allowFreeText}
                  onChange={(event) => {
                    const next = [...options]
                    next[optionIndex] = { ...option, allowFreeText: event.target.checked }
                    updateColumnOptions(section.id, column.id, next)
                  }}
                />
                자유서술
              </label>
              <button
                type="button"
                disabled={options.length <= 1}
                onClick={() => updateColumnOptions(section.id, column.id, options.filter((_, i) => i !== optionIndex))}
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {isEditing ? (
        <label className="min-w-0 pl-0 text-xs font-medium text-gray-600 sm:pl-8">
          AI 판단 기준
          <textarea
            value={column.aiHint}
            onChange={(event) => updateColumnAiHint(section.id, column.id, event.target.value)}
            placeholder={column.sourceDefinition || column.description || "원문에서 어떤 근거가 있을 때 이 필드를 채울지 적어주세요."}
            className="mt-1 min-h-[64px] w-full resize-y rounded-md border border-gray-300 bg-white px-2 py-1 text-xs leading-relaxed text-gray-900"
          />
        </label>
      ) : column.aiHint.trim() ? (
        <p className="pl-0 text-xs leading-relaxed text-blue-700 sm:pl-8">판단 기준: {column.aiHint}</p>
      ) : null}
    </div>
  )
}

function SortableSectionCard({
  section,
  isEditing,
  onUpdateSectionName,
  onAddColumn,
  onRemoveSection,
  onUpdateColumnName,
  onUpdateColumnDescription,
  onUpdateColumnAiHint,
  onUpdateColumnType,
  onUpdateColumnOptions,
  onUpdateColumnHidden,
  onRemoveColumn,
}: {
  section: TemplateSectionDraft
  isEditing: boolean
  onUpdateSectionName: (sectionId: string, value: string) => void
  onAddColumn: (sectionId: string) => void
  onRemoveSection: (sectionId: string) => void
  onUpdateColumnName: (sectionId: string, columnId: string, value: string) => void
  onUpdateColumnDescription: (sectionId: string, columnId: string, value: string) => void
  onUpdateColumnAiHint: (sectionId: string, columnId: string, value: string) => void
  onUpdateColumnType: (sectionId: string, columnId: string, value: TemplateValueType) => void
  onUpdateColumnOptions: (sectionId: string, columnId: string, value: TemplateFieldOption[]) => void
  onUpdateColumnHidden: (sectionId: string, columnId: string, hidden: boolean) => void
  onRemoveColumn: (sectionId: string, columnId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionDndId(section.id),
    disabled: !isEditing,
  })

  return (
    <section ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${isDragging ? "opacity-60" : "opacity-100"}`}>
      <div className="flex items-center gap-2">
        {isEditing ? <button type="button" className="rounded-md border border-gray-200 p-1 text-gray-500" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button> : null}
        {isEditing ? (
          <input type="text" value={section.name} onChange={(event) => onUpdateSectionName(section.id, event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-gray-300 px-2 text-sm font-semibold" />
        ) : (
          <h3 className="min-w-0 flex-1 text-sm font-semibold">{section.name}</h3>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <SortableContext items={section.columns.map((column) => columnDndId(column.id))} strategy={verticalListSortingStrategy}>
          {section.columns.map((column) => (
            <SortableColumnRow
              key={column.id}
              section={section}
              column={column}
              isEditing={isEditing}
              updateColumnName={onUpdateColumnName}
              updateColumnDescription={onUpdateColumnDescription}
              updateColumnAiHint={onUpdateColumnAiHint}
              updateColumnType={onUpdateColumnType}
              updateColumnOptions={onUpdateColumnOptions}
              updateColumnHidden={onUpdateColumnHidden}
              removeColumn={onRemoveColumn}
            />
          ))}
        </SortableContext>
      </div>
      {isEditing ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onAddColumn(section.id)}
            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            + 소주제 추가
          </button>
          <button
            type="button"
            onClick={() => onRemoveSection(section.id)}
            className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            대주제 삭제
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default function AdminTemplatesPage() {
  const { user, token } = useAuth()
  const templatesQuery = useTemplatesMapQuery()
  const presetsQuery = useTemplatePresetsQuery(token)
  const createTemplateMutation = useCreateTemplateUiMutation(token ?? "")
  const putTemplateMutation = usePutTemplateUiMutation(token ?? "")
  const deleteTemplateMutation = useDeleteTemplateUiMutation(token ?? "")
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const [overlayTemplateId, setOverlayTemplateId] = useState<VoiceRecordTemplateId | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState("")
  const [draftSections, setDraftSections] = useState<TemplateSectionDraft[]>([])
  /** 수정 모드에서만 사용. 저장 시 서버 display_title 반영 */
  const [draftDisplayTitle, setDraftDisplayTitle] = useState("")
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTemplateId, setNewTemplateId] = useState("")
  const [newTemplateJson, setNewTemplateJson] = useState(DEFAULT_NEW_TEMPLATE_JSON)
  const [newTemplateDisplayTitle, setNewTemplateDisplayTitle] = useState("")
  const [newTemplateError, setNewTemplateError] = useState("")
  const [activePresetTab, setActivePresetTab] = useState<PresetCategory>("common")
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [activeDragPreview, setActiveDragPreview] = useState<ActiveDragPreview | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [sort, setSort] = useState<"latest" | "oldest">("latest")

  const templateMap = templatesQuery.data ?? {}
  /**
   * 서버 findAll 결과만 사용(삭제된 템플릿은 API에서 제외). 로딩 중에는 기본 목록으로 대체.
   * 시스템 잠금 양식(SOAP/SOAPIE/SBAR)을 항상 맨 앞에 고정하고, 그 외는 한국어 정렬.
   */
  const templateIds = useMemo(() => {
    const all = Object.keys(templateMap)
    const lockedFirst = BUILTIN_LOCKED_VOICE_TEMPLATE_IDS.filter((id) => all.includes(id))
    const rest = all
      .filter((id) => !BUILTIN_LOCKED_VOICE_TEMPLATE_IDS.includes(id))
      .sort((a, b) => a.localeCompare(b, "ko"))
    const items = [...lockedFirst, ...rest]
    return items.sort((a, b) => {
      const aTime = new Date(templateMap[a]?.updatedAt ?? 0).getTime()
      const bTime = new Date(templateMap[b]?.updatedAt ?? 0).getTime()
      const delta = aTime - bTime
      if (delta !== 0) return sort === "latest" ? -delta : delta
      return a.localeCompare(b, "ko")
    })
  }, [templateMap, sort])
  const openedMeta = overlayTemplateId ? templateMap[overlayTemplateId] : null
  const openedSections = useMemo(() => {
    if (!overlayTemplateId) return {}
    return sectionsForAdminOverlay(
      overlayTemplateId,
      templateMap[overlayTemplateId]?.sections ?? null,
    )
  }, [overlayTemplateId, templateMap])

  const presets = presetsQuery.data ?? []
  const filteredPresets = presets.filter((preset) => preset.category === activePresetTab)
  const selectedPreset = presets.find((preset) => preset.presetId === selectedPresetId) ?? null

  function openOverlay(templateId: VoiceRecordTemplateId) {
    setOverlayTemplateId(templateId)
    setDraftSections(
      toDraftSections(
        sectionsForAdminOverlay(templateId, templateMap[templateId]?.sections ?? null),
      ),
    )
    setDraftDisplayTitle(templateMap[templateId]?.displayTitle ?? "")
    setIsEditing(false)
    setMessage("")
  }

  async function createTemplateFromJson() {
    if (!token || !user || user.role !== "admin") return
    setNewTemplateError("")
    const templateId = newTemplateId.trim()
    if (!templateId) {
      setNewTemplateError("templateId를 입력해 주세요.")
      return
    }
    if (isBuiltinLockedVoiceTemplate(templateId)) {
      setNewTemplateError("해당 ID는 시스템 기본 양식으로 예약되어 있습니다.")
      return
    }
    let sections: TemplateSectionMap
    try {
      const parsed = JSON.parse(newTemplateJson) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("JSON 최상위는 객체여야 합니다.")
      }
      const normalized: TemplateSectionMap = {}
      for (const [sectionName, columns] of Object.entries(parsed as Record<string, unknown>)) {
        if (!sectionName.trim()) throw new Error("대주제 이름이 비어 있습니다.")
        if (!columns || typeof columns !== "object" || Array.isArray(columns)) {
          throw new Error(`대주제 "${sectionName}"의 값은 객체여야 합니다.`)
        }
        const cols: Record<string, TemplateColumnDef> = {}
        for (const [columnName, raw] of Object.entries(columns as Record<string, unknown>)) {
          if (!columnName.trim()) throw new Error(`대주제 "${sectionName}"의 소주제 이름이 비어 있습니다.`)
          if (typeof raw === "string") {
            const t = normalizeStoredTemplateValueType(raw)
            if (isChoiceTemplateValueType(t)) {
              throw new Error(
                `소주제 "${columnName}"의 타입 "${t}"는 객체 형태와 options가 필요합니다.`,
              )
            }
            if (!isValidRawTemplateValueType(raw)) {
              throw new Error(
                `소주제 "${columnName}"의 타입이 올바르지 않습니다. (text_long, text_short, number, date, datetime, boolean, single_select, multi_select, computed, image, section_note)`,
              )
            }
            cols[columnName] = { type: t }
          } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const obj = raw as Record<string, unknown>
            const typeRaw = typeof obj.type === "string" ? obj.type : ""
            if (!isValidRawTemplateValueType(typeRaw)) {
              throw new Error(
                `소주제 "${columnName}"의 type이 올바르지 않습니다. (text_long, text_short, number, date, datetime, boolean, single_select, multi_select, computed, image, section_note)`,
              )
            }
            const type = normalizeStoredTemplateValueType(typeRaw)
            const def: TemplateColumnDef = { type }
            if (typeof obj.description === "string" && obj.description.trim()) {
              def.description = obj.description.trim()
            }
            if (isChoiceTemplateValueType(type)) {
              const optRaw = obj.options
              if (optRaw === undefined || optRaw === null) {
                throw new Error(`소주제 "${columnName}"에 options 객체가 필요합니다.`)
              }
              if (typeof optRaw !== "object" || Array.isArray(optRaw)) {
                throw new Error(`소주제 "${columnName}"의 options는 객체여야 합니다.`)
              }
              const opts: Record<string, string> = {}
              for (const [k, v] of Object.entries(optRaw as Record<string, unknown>)) {
                const key = k.trim()
                if (!key) throw new Error(`소주제 "${columnName}"의 options에 빈 키는 허용되지 않습니다.`)
                if (typeof v !== "string") {
                  throw new Error(`소주제 "${columnName}"의 options 값은 문자열만 허용됩니다.`)
                }
                opts[key] = v
              }
              if (Object.keys(opts).length === 0) {
                throw new Error(
                  `소주제 "${columnName}"의 타입 "${type}"에는 options에 최소 1개의 선택지가 필요합니다.`,
                )
              }
              def.options = opts
            }
            cols[columnName] = def
          } else {
            throw new Error(
              `소주제 "${columnName}"의 정의가 올바르지 않습니다. { type, description?, options? } 형식이어야 합니다.`,
            )
          }
        }
        normalized[sectionName] = cols
      }
      sections = normalized
    } catch (e) {
      setNewTemplateError(e instanceof Error ? e.message : "JSON 문법이 올바르지 않습니다.")
      return
    }
    try {
      await createTemplateMutation.mutateAsync({
        templateId,
        sections,
        ...(newTemplateDisplayTitle.trim() ? { displayTitle: newTemplateDisplayTitle.trim().slice(0, 128) } : {}),
      })
      setIsCreateModalOpen(false)
      setNewTemplateId("")
      setNewTemplateJson(DEFAULT_NEW_TEMPLATE_JSON)
      setNewTemplateDisplayTitle("")
      setNewTemplateError("")
      setMessage(`"${templateId}" 템플릿이 추가되었습니다.`)
    } catch (e) {
      setNewTemplateError(e instanceof Error ? e.message : "템플릿 추가에 실패했습니다.")
    }
  }

  function onDragStart(event: DragStartEvent) {
    if (!isEditing) return
    const activeId = String(event.active.id)
    const activeSection = parseSectionDndId(activeId)
    if (activeSection) {
      const section = draftSections.find((item) => item.id === activeSection)
      if (!section) return
      setActiveDragPreview({ kind: "section", title: section.name || "이름 없는 대주제" })
      return
    }
    const activeColumn = parseColumnDndId(activeId)
    if (!activeColumn) return
    for (const section of draftSections) {
      const column = section.columns.find((item) => item.id === activeColumn)
      if (!column) continue
      setActiveDragPreview({
        kind: "column",
        title: column.name || "이름 없는 소주제",
        valueType: column.valueType,
      })
      return
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDragPreview(null)
    if (!isEditing) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const activeSection = parseSectionDndId(activeId)
    const overSection = parseSectionDndId(overId)
    if (activeSection && overSection) {
      setDraftSections((prev) => {
        const oldIndex = prev.findIndex((section) => section.id === activeSection)
        const newIndex = prev.findIndex((section) => section.id === overSection)
        if (oldIndex < 0 || newIndex < 0) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
      return
    }

    const activeColumn = parseColumnDndId(activeId)
    const overColumn = parseColumnDndId(overId)
    if (!activeColumn || !overColumn) return

    setDraftSections((prev) => {
      let sourceS = -1
      let sourceC = -1
      let targetS = -1
      let targetC = -1
      prev.forEach((section, sIdx) => {
        const aIdx = section.columns.findIndex((column) => column.id === activeColumn)
        if (aIdx >= 0) {
          sourceS = sIdx
          sourceC = aIdx
        }
        const oIdx = section.columns.findIndex((column) => column.id === overColumn)
        if (oIdx >= 0) {
          targetS = sIdx
          targetC = oIdx
        }
      })
      if (sourceS < 0 || sourceC < 0 || targetS < 0 || targetC < 0) return prev
      const next = prev.map((section) => ({ ...section, columns: [...section.columns] }))
      const [moved] = next[sourceS].columns.splice(sourceC, 1)
      let insert = targetC
      if (sourceS === targetS && sourceC < targetC) insert = targetC - 1
      next[targetS].columns.splice(insert, 0, moved)
      return next
    })
  }

  async function confirmDeleteTemplate() {
    if (!overlayTemplateId || !token || !user || user.role !== "admin") return
    if (isBuiltinLockedVoiceTemplate(overlayTemplateId)) {
      setDeleteError("시스템 기본 양식은 삭제할 수 없습니다.")
      return
    }
    setDeleteError("")
    try {
      const res = await deleteTemplateMutation.mutateAsync(overlayTemplateId)
      setIsDeleteConfirmOpen(false)
      setDeleteError("")
      setOverlayTemplateId(null)
      setIsEditing(false)
      setMessage(`템플릿을 삭제했습니다. 삭제된 기록: ${res.deletedRecords}건.`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "템플릿 삭제에 실패했습니다.")
    }
  }

  async function duplicateTemplate() {
    if (!overlayTemplateId || !token || !user || user.role !== "admin") return
    const suffix = new Date().toISOString().slice(0, 10).replaceAll("-", "")
    const baseId = `${overlayTemplateId}-copy-${suffix}`
    let templateId = baseId
    let index = 2
    while (templateMap[templateId]) {
      templateId = `${baseId}-${index}`
      index += 1
    }
    try {
      await createTemplateMutation.mutateAsync({
        templateId,
        sections: openedSections,
        displayTitle: `${
          openedMeta?.displayTitle?.trim() || overlayTemplateId
        } 복사본`,
      })
      setOverlayTemplateId(null)
      setMessage(`"${templateId}" 템플릿을 복제했습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "템플릿 복제에 실패했습니다.")
    }
  }

  async function saveTemplate() {
    if (!overlayTemplateId || !token || !user || user.role !== "admin") return
    if (isBuiltinLockedVoiceTemplate(overlayTemplateId)) {
      setMessage("시스템 기본 양식은 저장할 수 없습니다.")
      return
    }
    setMessage("")
    if (hasEmptySection(draftSections)) {
      setMessage("소주제가 비어있는 대주제가 있으면 저장할 수 없습니다.")
      return
    }
    let sectionsToSave: TemplateSectionMap
    try {
      sectionsToSave = toSectionMap(draftSections)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "템플릿 구조가 올바르지 않습니다.")
      return
    }
    if (!Object.keys(sectionsToSave).length) {
      setMessage("최소 1개 이상의 대주제와 소주제가 필요합니다.")
      return
    }
    try {
      await putTemplateMutation.mutateAsync({
        templateId: overlayTemplateId,
        sections: sectionsToSave,
        displayTitle: draftDisplayTitle,
      })
      setDraftSections(toDraftSections(sectionsToSave))
      setIsEditing(false)
      setMessage("템플릿이 저장되었습니다.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "템플릿 저장에 실패했습니다.")
    }
  }

  function exportCurrentJson() {
    try {
      const target = isEditing ? toSectionMap(draftSections) : openedSections
      return JSON.stringify(target, null, 2)
    } catch {
      return JSON.stringify(openedSections, null, 2)
    }
  }

  if (!user || !token) return null
  const renderSections = isEditing ? draftSections : toDraftSections(openedSections)
  const overlayIsBuiltinLocked = Boolean(
    overlayTemplateId && isBuiltinLockedVoiceTemplate(overlayTemplateId),
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1f2024]">템플릿</h1>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as "latest" | "oldest")}
          className="h-9 rounded-[5px] border border-[#e5e7eb] bg-white px-3 text-sm"
          aria-label="템플릿 정렬"
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>
      {!overlayTemplateId && message ? <p className="text-sm text-gray-700">{message}</p> : null}
      {templatesQuery.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {templatesQuery.error instanceof Error
            ? templatesQuery.error.message
            : "템플릿을 불러오지 못했습니다."}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
        {templateIds.map((templateId) => {
          const meta = templateMap[templateId]
          const displayLabel =
            meta?.displayTitle != null && String(meta.displayTitle).trim() !== ""
              ? String(meta.displayTitle).trim()
              : templateId
          const lockedBuiltin = isBuiltinLockedVoiceTemplate(templateId)
          return (
            <div key={templateId} className="relative min-h-[90px] rounded-[8px] border border-[#e5e7eb] bg-white p-4 lg:min-h-[180px]">
              <div className="flex flex-wrap items-center gap-2 pr-16">
                <span
                  className={
                    lockedBuiltin
                      ? "rounded-sm border border-[#3b82f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#155dfc]"
                      : "rounded-sm bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  }
                >
                  {lockedBuiltin ? "기본" : "커스텀"}
                </span>
                <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{displayLabel}</p>
              </div>
              {displayLabel !== templateId ? (
                <p className="mt-0.5 truncate text-xs text-gray-500" title={templateId}>
                  {templateId}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-gray-500">
                섹션 {meta?.sectionCount ?? Object.keys(meta?.sections ?? {}).length}개 · 필드{" "}
                {meta?.fieldCount ??
                  Object.values(meta?.sections ?? {}).reduce(
                    (count, fields) => count + Object.keys(fields).length,
                    0,
                  )}개
              </p>
              {meta?.updatedAt ? (
                <p className="mt-1 text-[11px] text-gray-400">
                  최근수정 {formatDateLabel(meta.updatedAt)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => openOverlay(templateId)}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-[#155dfc] hover:underline lg:bottom-3 lg:top-auto lg:translate-y-0"
              >
                자세히 보기
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setIsCreateModalOpen(true)
            setNewTemplateError("")
            setNewTemplateDisplayTitle("")
          }}
          className="min-h-[64px] rounded-[8px] border border-dashed border-[#3b82f6] bg-blue-50/60 p-4 text-left text-sm font-semibold text-[#155dfc] hover:bg-blue-100/60 lg:min-h-[180px]"
        >
          + 새 템플릿(JSON) 추가
        </button>
      </div>

      {overlayTemplateId ? (
        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] top-0 z-[40] flex flex-col bg-[#f9fafb] lg:bottom-0 lg:left-[100px]">
          <div className="border-b border-gray-200 bg-white px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="grid grid-cols-[44px_1fr_44px] items-start">
              <button
                type="button"
                onClick={() => setOverlayTemplateId(null)}
                className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-gray-100"
                aria-label="템플릿 목록으로 돌아가기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            <div className="min-w-0 flex-1 pr-3">
              {isEditing ? (
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">표시 제목 (비우면 ID로 표시)</span>
                  <input
                    type="text"
                    value={draftDisplayTitle}
                    onChange={(event) => setDraftDisplayTitle(event.target.value)}
                    maxLength={128}
                    className="mt-1 h-10 w-full max-w-xl rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-900"
                    placeholder={overlayTemplateId}
                  />
                </label>
              ) : (
                <h2 className="truncate text-center text-xl font-bold text-gray-900">
                  {openedMeta?.displayTitle != null && String(openedMeta.displayTitle).trim() !== ""
                    ? String(openedMeta.displayTitle).trim()
                    : overlayTemplateId}
                </h2>
              )}
              <p className="mt-2 truncate text-center text-xs text-gray-500" title={overlayTemplateId}>
                템플릿 ID: {overlayTemplateId}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-gray-400">
                <span>생성일자: {formatDateLabel(openedMeta?.createdAt ?? null)}</span>
                <span>수정일자: {formatDateLabel(openedMeta?.updatedAt ?? null)}</span>
              </div>
            </div>
            <span />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void duplicateTemplate()}
                className="inline-flex h-10 items-center gap-1.5 rounded-[5px] border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                복제하기
              </button>
              {!overlayIsBuiltinLocked ? (
                <>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSections(toDraftSections(openedSections))
                        setDraftDisplayTitle(openedMeta?.displayTitle ?? "")
                        setIsEditing(true)
                        setMessage("")
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-[5px] bg-[#3b82f6] px-4 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                      수정하기
                    </button>
                  ) : (
                    <button type="button" onClick={() => void saveTemplate()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">저장</button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("")
                      setIsDeleteConfirmOpen(true)
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-[5px] border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    템플릿 삭제
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-600">시스템 기본 양식은 수정·삭제할 수 없습니다.</span>
              )}
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(exportCurrentJson())
                  setMessage("현재 템플릿 JSON을 복사했습니다.")
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                JSON 추출
              </button>
            </div>
          </div>

          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto p-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveDragPreview(null)}
            >
              <SortableContext items={renderSections.map((section) => sectionDndId(section.id))} strategy={verticalListSortingStrategy}>
                {renderSections.map((section) => (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    isEditing={isEditing}
                    onUpdateSectionName={(sectionIdValue, value) => setDraftSections((prev) => prev.map((item) => item.id === sectionIdValue ? { ...item, name: value } : item))}
                    onAddColumn={(sectionIdValue) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: [
                                  ...item.columns,
                                  {
                                    id: createUid("column"),
                                    fieldKey: createUid("field").slice(0, 96),
                                    name: "새 항목",
                                    description: "",
                                    aiHint: "",
                                    valueType: "text_short",
                                    hidden: false,
                                    options: [],
                                    conditions: [],
                                    inputSources: [],
                                  },
                                ],
                              },
                        ),
                      )
                    }
                    onRemoveSection={(sectionIdValue) =>
                      setDraftSections((prev) => prev.filter((item) => item.id !== sectionIdValue))
                    }
                    onUpdateColumnName={(sectionIdValue, columnIdValue, value) => setDraftSections((prev) => prev.map((item) => item.id !== sectionIdValue ? item : { ...item, columns: item.columns.map((column) => column.id === columnIdValue ? { ...column, name: value } : column) }))}
                    onUpdateColumnDescription={(sectionIdValue, columnIdValue, value) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.map((column) =>
                                  column.id === columnIdValue
                                    ? { ...column, description: value }
                                    : column,
                                ),
                              },
                        ),
                      )
                    }
                    onUpdateColumnAiHint={(sectionIdValue, columnIdValue, value) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.map((column) =>
                                  column.id === columnIdValue
                                    ? { ...column, aiHint: value }
                                    : column,
                                ),
                              },
                        ),
                      )
                    }
                    onUpdateColumnType={(sectionIdValue, columnIdValue, value) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.map((column) =>
                                  column.id === columnIdValue
                                    ? {
                                        ...column,
                                        valueType: value,
                                        options: isChoiceTemplateValueType(value)
                                          ? normalizeDraftOptions(column)
                                          : [],
                                      }
                                    : column,
                                ),
                              },
                        ),
                      )
                    }
                    onUpdateColumnOptions={(sectionIdValue, columnIdValue, options) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.map((column) =>
                                  column.id === columnIdValue ? { ...column, options } : column,
                                ),
                              },
                        ),
                      )
                    }
                    onUpdateColumnHidden={(sectionIdValue, columnIdValue, hidden) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.map((column) =>
                                  column.id === columnIdValue
                                    ? { ...column, hidden }
                                    : column,
                                ),
                              },
                        ),
                      )
                    }
                    onRemoveColumn={(sectionIdValue, columnIdValue) =>
                      setDraftSections((prev) =>
                        prev.map((item) =>
                          item.id !== sectionIdValue
                            ? item
                            : {
                                ...item,
                                columns: item.columns.filter((column) => column.id !== columnIdValue),
                              },
                        ),
                      )
                    }
                  />
                ))}
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeDragPreview ? (
                  <div className="min-w-[220px] rounded-xl border border-blue-300 bg-white px-3 py-2 shadow-2xl">
                    <p className="text-xs text-blue-600">
                      {activeDragPreview.kind === "section" ? "대주제 이동" : "소주제 이동"}
                    </p>
                    <p className="truncate text-sm font-semibold text-gray-900">{activeDragPreview.title}</p>
                    {activeDragPreview.valueType ? (
                      <p className="mt-1 text-xs text-gray-500">{activeDragPreview.valueType}</p>
                    ) : null}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {message ? <p className="text-sm text-gray-700">{message}</p> : null}
          </div>
        </div>
      ) : null}

      {isDeleteConfirmOpen && overlayTemplateId ? (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="delete-template-title">
            <h3 id="delete-template-title" className="text-base font-semibold text-gray-900">템플릿 삭제</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              이 템플릿을 삭제하면, 이 템플릿으로 저장된 모든 기록이 함께 삭제되며 복구할 수 없습니다. 계속하시겠습니까?
            </p>
            <p className="mt-2 text-xs text-gray-500">템플릿 ID: {overlayTemplateId}</p>
            {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteTemplateMutation.isPending}
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteError("")
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={deleteTemplateMutation.isPending}
                onClick={() => void confirmDeleteTemplate()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteTemplateMutation.isPending ? "삭제 중…" : "삭제 확인"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">새 템플릿(JSON) 추가</h3>
            </div>
            <div className="space-y-3 p-4">
              <label className="block text-sm font-medium text-gray-700">
                templateId
                <input
                  type="text"
                  value={newTemplateId}
                  onChange={(event) => setNewTemplateId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="예: 신규간호기록지"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                표시 제목 (선택)
                <input
                  type="text"
                  value={newTemplateDisplayTitle}
                  onChange={(event) => setNewTemplateDisplayTitle(event.target.value)}
                  maxLength={128}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="카드·목록에 보일 이름"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                fields_json (3중 JSON)
                <textarea
                  value={newTemplateJson}
                  onChange={(event) => setNewTemplateJson(event.target.value)}
                  spellCheck={false}
                  className="mt-1 min-h-[280px] w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                />
              </label>
              {newTemplateError ? (
                <p className="text-sm text-red-600">{newTemplateError}</p>
              ) : (
                <div className="space-y-1 text-xs text-gray-500">
                  <p>
                    구조: 대주제 → 소주제 → {"{"} type, description(선택), options {"}"}. 모든 소주제에{" "}
                    <code className="rounded bg-gray-100 px-0.5">options</code> 키를 두고, 선택이 필요 없는 타입은{" "}
                    <code className="rounded bg-gray-100 px-0.5">{"{}"}</code> 로 둡니다.
                  </p>
                  <p>
                    <code className="rounded bg-gray-100 px-0.5">single_select</code>,{" "}
                    <code className="rounded bg-gray-100 px-0.5">multi_select</code> 는{" "}
                    <code className="rounded bg-gray-100 px-0.5">options</code> 에 선택지 키를 최소 1개 이상 넣어야
                    합니다(값은 보조 문자열, 빈 문자열 허용).
                  </p>
                  <p>
                    레거시: 소주제 값이 <code className="rounded bg-gray-100 px-0.5">"text_long"</code> 같은 문자열 한
                    줄만 올 수도 있습니다(choice 타입은 불가).
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">취소</button>
              <button type="button" onClick={() => void createTemplateFromJson()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">추가</button>
            </div>
          </div>
        </div>
      ) : null}

      {isPresetModalOpen ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3"><h3 className="text-base font-semibold text-gray-900">대주제 템플릿 추가</h3></div>
            <div className="grid min-h-[360px] grid-cols-1 md:grid-cols-[13rem_minmax(0,1fr)]">
              <aside className="border-r border-gray-200 bg-gray-50 p-3">
                <div className="space-y-1">{CATEGORY_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => { setActivePresetTab(tab.id); setSelectedPresetId(null) }} className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab.id === activePresetTab ? "bg-blue-100 font-semibold text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}>{tab.label}</button>)}</div>
              </aside>
              <section className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                <div className="space-y-2">{filteredPresets.map((preset) => <button key={preset.presetId} type="button" onClick={() => setSelectedPresetId(preset.presetId)} className={`w-full rounded-lg border px-3 py-2 text-left ${selectedPresetId === preset.presetId ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}><p className="text-sm font-semibold text-gray-900">{preset.title}</p><p className="mt-0.5 text-xs text-gray-500">{preset.presetId}</p></button>)}</div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-800">템플릿 미리보기</p>
                  {selectedPreset ? (
                    <div className="mt-2 space-y-2 text-xs text-gray-700">
                      {Object.entries(selectedPreset.sections).map(([sectionName, columns]) => (
                        <div key={sectionName}>
                          <p className="font-semibold">{sectionName}</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {Object.entries(columns).map(([columnName, def]) => {
                              const optKeys =
                                def.options && Object.keys(def.options).length > 0
                                  ? Object.keys(def.options).join(", ")
                                  : null;
                              return (
                                <li key={columnName}>
                                  {columnName} ({def.type}
                                  {optKeys ? <span className="text-gray-500"> — options: {optKeys}</span> : null})
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">왼쪽 목록에서 템플릿을 선택해 주세요.</p>
                  )}
                </div>
              </section>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button type="button" onClick={() => setIsPresetModalOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">취소</button>
              <button type="button" onClick={() => { if (!selectedPreset) { setMessage("추가할 대주제 템플릿을 선택해 주세요."); return } setDraftSections((prev) => mergePreset(prev, selectedPreset)); setIsPresetModalOpen(false); setSelectedPresetId(null); setMessage(`"${selectedPreset.title}" 템플릿을 추가했습니다.`) }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">확인</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
