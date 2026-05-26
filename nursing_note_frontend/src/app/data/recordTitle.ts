import type { TemplateUiConfigMap } from "@/app/data/template-field-registry";

/** 템플릿 ID → 표시용 분류명(displayTitle 우선) */
export function classificationLabelForTemplate(
  templateId: string,
  templateMap: TemplateUiConfigMap | undefined,
): string {
  if (!templateMap) return templateId;
  const meta = templateMap[templateId];
  const raw = meta?.displayTitle;
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  return templateId;
}

/**
 * 기본 제목: 기록지분류-YYYY.M.D HH:mm
 * - recordDate: YYYY-MM-DD, recordTime: HH:mm 또는 HH:mm:ss
 */
export function buildDefaultRecordTitle(opts: {
  classificationLabel: string;
  recordDate: string;
  recordTime: string;
}): string {
  const cls = String(opts.classificationLabel ?? "").trim() || "—";
  const dateRaw = String(opts.recordDate ?? "").trim();
  const m = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const y = m ? Number(m[1]) : NaN;
  const mo = m ? Number(m[2]) : NaN;
  const d = m ? Number(m[3]) : NaN;
  const now = new Date();
  const dateStr =
    Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)
      ? `${y}.${mo}.${d}`
      : `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
  const timeRaw = String(opts.recordTime ?? "").trim();
  const tm = timeRaw.match(/(\d{1,2}):(\d{1,2})/);
  const hh = tm ? tm[1]!.padStart(2, "0") : String(now.getHours()).padStart(2, "0");
  const mm = tm ? tm[2]!.padStart(2, "0") : String(now.getMinutes()).padStart(2, "0");
  return `${cls}-${dateStr} ${hh}:${mm}`;
}
