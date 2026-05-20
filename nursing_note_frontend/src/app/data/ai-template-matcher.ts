import { splitTemplateLabel, type TemplateFieldEffective, type TemplateInputKind } from "@/app/data/template-field-registry";

export interface RequiredInfoItem {
  key: string;
  label: string;
  section: string;
  field: string;
  inputKind: TemplateInputKind;
  aliases: string[];
}

export interface ExtractedFact {
  key: string;
  value: string;
  confidence: number;
  source: "rule" | "input";
}

export interface StructuredHintItem {
  key: string;
  value: string;
  confidence: number;
  source: "rule" | "input";
}

const ALIAS_MAP: Array<{ pattern: RegExp; aliases: string[] }> = [
  { pattern: /혈압|blood\s*pressure|bp/i, aliases: ["혈압", "bp", "blood pressure"] },
  { pattern: /혈당|blood\s*sugar|glucose|bs/i, aliases: ["혈당", "혈당수치", "blood sugar"] },
  { pattern: /과거력|병력|past\s*history|history/i, aliases: ["과거력", "병력", "history"] },
  { pattern: /키|신장|height|ht/i, aliases: ["키", "신장", "height"] },
  { pattern: /몸무게|체중|weight|wt/i, aliases: ["몸무게", "체중", "weight"] },
  { pattern: /식사량|식이|meal|intake/i, aliases: ["식사량", "식이", "섭취량"] },
  { pattern: /운동량|활동량|exercise|activity/i, aliases: ["운동량", "활동량", "exercise"] },
];

function inferAliases(label: string, field: string): string[] {
  const base = [label, field].map((v) => v.trim()).filter((v) => v.length > 0);
  for (const item of ALIAS_MAP) {
    if (item.pattern.test(label) || item.pattern.test(field)) {
      return [...new Set([...base, ...item.aliases])];
    }
  }
  return base;
}

export function buildRequiredInfoItems(fields: TemplateFieldEffective[]): RequiredInfoItem[] {
  return fields
    .filter((f) => !f.hidden)
    .map((f) => {
      const { section, field } = splitTemplateLabel(f.label);
      return {
        key: f.storageKey,
        label: f.label,
        section,
        field,
        inputKind: f.inputKind,
        aliases: inferAliases(f.label, field),
      };
    });
}

export function extractFactsFromInput(text: string): ExtractedFact[] {
  const out: ExtractedFact[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return out;

  const bloodPressure = normalized.match(/(\d{2,3})\s*\/\s*(\d{2,3})\s*(mmhg)?/i);
  if (bloodPressure) {
    out.push({ key: "혈압", value: `${bloodPressure[1]}/${bloodPressure[2]}`, confidence: 0.92, source: "rule" });
  }
  const bloodSugar = normalized.match(/(?:혈당|blood\s*sugar|glucose)[^\d]{0,8}(\d{2,3})/i);
  if (bloodSugar) {
    out.push({ key: "혈당", value: bloodSugar[1], confidence: 0.9, source: "rule" });
  }
  const height = normalized.match(/(?:키|신장|height)[^\d]{0,8}(\d{2,3}(?:\.\d+)?)\s*cm?/i);
  if (height) {
    out.push({ key: "키", value: `${height[1]}cm`, confidence: 0.9, source: "rule" });
  }
  const weight = normalized.match(/(?:몸무게|체중|weight)[^\d]{0,8}(\d{2,3}(?:\.\d+)?)\s*kg?/i);
  if (weight) {
    out.push({ key: "몸무게", value: `${weight[1]}kg`, confidence: 0.9, source: "rule" });
  }

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines) {
    const kv = line.match(/^([^\s:：]{1,30})\s*[:：]\s*(.+)$/);
    if (!kv) continue;
    out.push({ key: kv[1], value: kv[2].trim(), confidence: 0.7, source: "input" });
  }
  return out;
}

export function matchFactsToRequiredInfo(
  requiredInfo: RequiredInfoItem[],
  facts: ExtractedFact[],
): StructuredHintItem[] {
  const matched: StructuredHintItem[] = [];
  for (const item of requiredInfo) {
    const aliases = item.aliases.map((a) => a.toLowerCase());
    const fact = facts.find((f) => {
      const sourceKey = f.key.toLowerCase();
      return aliases.some((alias) => sourceKey.includes(alias) || alias.includes(sourceKey));
    });
    if (!fact) continue;
    matched.push({
      key: item.key,
      value: fact.value,
      confidence: fact.confidence,
      source: fact.source,
    });
  }
  return matched;
}

/**
 * 화면 역할 분리 정책:
 * - AI기록생성: 환자 기본정보 + 메모 텍스트를 inputText로 전달
 * - AI기록요약: 선택한 기존 기록 텍스트/메타를 inputText로 전달
 */
export function buildStructuredHintsFromTemplate(
  fields: TemplateFieldEffective[],
  inputText: string,
): StructuredHintItem[] {
  const requiredInfo = buildRequiredInfoItems(fields);
  const facts = extractFactsFromInput(inputText);
  return matchFactsToRequiredInfo(requiredInfo, facts);
}

export function buildHintContextText(hints: StructuredHintItem[]): string {
  if (!hints.length) return "";
  const lines = hints.map(
    (h) => `- ${h.key}: ${h.value} (confidence=${h.confidence.toFixed(2)}, source=${h.source})`,
  );
  return `[Structured hints]\n${lines.join("\n")}`;
}
