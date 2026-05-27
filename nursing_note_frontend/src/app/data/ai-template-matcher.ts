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

function normalizeClinicalText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fieldSearchText(field: TemplateFieldEffective): string {
  return [
    field.storageKey,
    field.label,
    field.description,
    field.aiHint,
    field.sourceDefinition,
  ]
    .map((v) => String(v ?? ""))
    .join(" ");
}

function optionKeysForField(field: TemplateFieldEffective): string[] {
  return field.optionDetails?.map((option) => option.optionKey) ?? Object.keys(field.options ?? {});
}

function hasOption(field: TemplateFieldEffective, optionKey: string): boolean {
  return optionKeysForField(field).includes(optionKey);
}

function numberNearPain(text: string): string {
  const painAnswerText = text
    .split(/(?<=요\.|다\.|요\?|까\?)/)
    .map((line) => line.trim())
    .filter((line) => !/0점부터\s*10점|10점까지|10점\s*만점/.test(line))
    .filter((line) => /(아프|아파|통증|점\s*정도|움직|가만히)/.test(line))
    .join(" ");
  const values = [...painAnswerText.matchAll(/(\d{1,2})(?:\s*점|\s*\/\s*10|점\s*정도)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 10);
  return values.length > 0 ? String(Math.max(...values)) : "";
}

function matchEducation(text: string): string {
  const m = text.match(/(초등학교|중학교|고등학교|대학교|대학원|초졸|중졸|고졸|대졸)[^.\n。]*(졸업|나왔|나오셨|졸|수료)?/);
  return m?.[0]?.trim() ?? "";
}

function inferRelationValue(field: TemplateFieldEffective, text: string): string {
  const candidates: Array<[RegExp, string]> = [
    [/딸|아들|자녀|딸이|아들이/, "자녀"],
    [/아내|남편|배우자|와이프|부인|남편분/, "배우자"],
    [/아버지|부친|아버님/, "부"],
    [/어머니|모친|어머님/, "모"],
    [/형제|형님|오빠|동생/, "형제"],
    [/자매|언니|누나|여동생/, "자매"],
    [/간병인/, "간병인"],
  ];
  for (const [pattern, option] of candidates) {
    if (pattern.test(text) && hasOption(field, option)) return option;
  }
  return "";
}

function inferSingleSelectValue(field: TemplateFieldEffective, text: string): string {
  const fieldText = fieldSearchText(field);
  const hasNone = hasOption(field, "없음");
  const hasYes = hasOption(field, "있음");

  if (/통증|pain|npis|nrs/i.test(fieldText)) {
    if (/통증|아프|아파|아픈|쑤시|찌르|욱신|불편|점\s*정도/.test(text)) {
      if (/통증.*없|아프.*않|안\s*아프|아픈\s*데는\s*없/.test(text) && hasNone) return "없음";
      if (hasYes) return "있음";
      if (hasOption(field, "입원 전에 있었음")) return "입원 전에 있었음";
    }
  }

  if (/알레르|allerg/i.test(fieldText)) {
    if (/알레르|알러지|두드러기|조영제|약물\s*부작용|음식.*못/.test(text)) {
      if (/알레르[기지]|알러지/.test(text) && /(없|전혀|하나도|아니요|없으)/.test(text) && hasNone) return "없음";
      if (/조영제/.test(text) && hasOption(field, "약")) return "약";
      if (/음식|식품/.test(text) && hasOption(field, "식품")) return "식품";
      if (hasYes) return "있음";
    }
  }

  if (/1개월간\s*체중변화|체중변화|몸무게.*변화/i.test(fieldText)) {
    if (/체중|몸무게|kg|살/.test(text)) {
      if (/빠졌|감소|줄었|내려|못\s*재|모르겠/.test(text) && hasOption(field, "감소함")) return "감소함";
      if (/늘었|증가|쪘/.test(text) && hasOption(field, "증가함")) return "증가함";
      if (/똑같|비슷|변화\s*없|계속\s*같|없/.test(text) && hasNone) return "없음";
    }
  }

  if (/식사량\s*변화|식사량|식욕|섭취/i.test(fieldText)) {
    if (/식사|밥|먹|입맛|공기/.test(text)) {
      if (/못\s*드|못\s*먹|반\s*공기|입맛이\s*없|감소/.test(text) && hasOption(field, "감소")) return "감소";
      if (/잘\s*먹|문제없이|평소랑\s*비슷|변화\s*없/.test(text) && hasNone) return "없음";
      if (/더\s*먹|증가/.test(text) && hasOption(field, "증가")) return "증가";
    }
  }

  if (/식이\s*주의|가리|못\s*드시는\s*음식|음식/i.test(fieldText)) {
    if (/음식|식사|가리|짜|염분|소금/.test(text)) {
      if (/가리.*없|못\s*드.*없|특별히\s*없|다\s*잘|문제없이/.test(text) && hasNone) return "없음";
      if (/짜|염분|소금/.test(text) && hasOption(field, "염분 제한")) return "염분 제한";
    }
  }

  if (/종교|relig/i.test(fieldText)) {
    const religionOptions = ["기독교", "천주교", "불교", "없음"];
    for (const option of religionOptions) {
      if (hasOption(field, option) && text.includes(option)) return option;
    }
    if (hasNone && /(무교|종교.*없|아니요.*없)/.test(text)) return "없음";
  }

  if (/보호자|퇴원\s*후\s*보호자|caregiver/i.test(fieldText)) {
    const relation = inferRelationValue(field, text);
    if (relation) return relation;
    if (/(보호자|같이|상주|퇴원.*같이)/.test(text) && hasYes) return "있음";
  }

  if (/입원\s*및\s*수술\s*이력|수술\s*이력|입원.*수술|과거병력|병력/i.test(fieldText)) {
    if (/(수술|입원|병원|진단|고혈압|당뇨|결핵|암|골다공증|부정맥)/.test(text)) {
      if (/(없|처음|전부|아예\s*처음)/.test(text) && hasNone) return "없음";
      if (hasYes) return "있음";
      for (const option of optionKeysForField(field)) {
        if (option !== "있음" && option !== "없음" && text.includes(option)) return option;
      }
    }
  }

  if (/복용중인\s*약|투약|약/i.test(fieldText)) {
    if (/(약|복용|먹고|처방|칼슘제|아스피린|혈압약|당뇨|골다공증)/.test(text)) {
      if (/(안\s*먹|없|말고는\s*없)/.test(text) && hasNone) return "없음";
      if (hasYes) return "있음";
    }
  }

  if (/낙상|넘어|보행|일상생활|활동/i.test(fieldText)) {
    if (/(넘어진|넘어지|보조기|지팡이|워커|혼자서|부축|걷)/.test(text)) {
      if (/(넘어진\s*적.*없|보조기\s*없이|혼자서.*가능|혼자서.*잘)/.test(text) && hasNone) return "없음";
      if (hasYes) return "있음";
    }
  }

  return "";
}

function inferTextValue(field: TemplateFieldEffective, text: string): string {
  const fieldText = fieldSearchText(field);
  if (/최종학력|학력|education/i.test(fieldText)) return matchEducation(text);
  if (/통증\s*강도|pain.*score|nrs|npis|점수/i.test(fieldText)) return numberNearPain(text);
  if (/시작시기|악화요인|완화요인|지속기간/i.test(fieldText)) {
    const painLine = text
      .split(/(?<=요\.|다\.|요\?|까\?)/)
      .map((line) => line.trim())
      .find((line) => /(아프|통증|점|움직|가만히)/.test(line));
    return painLine ?? "";
  }
  if (/주\s*증상|내원\s*과정|현병력|chief/i.test(fieldText)) {
    const line = text
      .split(/(?<=요\.|다\.|요\?|까\?)/)
      .map((item) => item.trim())
      .find((item) => /(오시|입원|응급실|다치|미끄러|수술|시술|검사)/.test(item));
    return line ?? "";
  }
  if (/약물명|복용.*약|투약|medication/i.test(fieldText)) {
    const line = text
      .split(/(?<=요\.|다\.|요\?|까\?)/)
      .map((item) => item.trim())
      .find((item) => /(약|복용|먹고|처방|칼슘제|아스피린|혈압약|당뇨|골다공증)/.test(item));
    return line ?? "";
  }
  return "";
}

function inferStructuredHintForField(
  field: TemplateFieldEffective,
  normalizedText: string,
): StructuredHintItem | null {
  if (field.inputKind === "single_select" || field.inputKind === "multi_select") {
    const value = inferSingleSelectValue(field, normalizedText);
    if (!value) return null;
    return { key: field.storageKey, value, confidence: 0.86, source: "rule" };
  }
  if (field.inputKind === "number" || field.inputKind === "text_short" || field.inputKind === "text_long") {
    const value = inferTextValue(field, normalizedText);
    if (!value) return null;
    return { key: field.storageKey, value, confidence: 0.82, source: "rule" };
  }
  return null;
}

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
  const normalized = normalizeClinicalText(text);
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
  const normalized = normalizeClinicalText(inputText);
  const inferred = fields
    .filter((f) => !f.hidden)
    .map((field) => inferStructuredHintForField(field, normalized))
    .filter((hint): hint is StructuredHintItem => Boolean(hint));
  const requiredInfo = buildRequiredInfoItems(fields);
  const facts = extractFactsFromInput(inputText);
  const legacyMatches = matchFactsToRequiredInfo(requiredInfo, facts);
  const byKey = new Map<string, StructuredHintItem>();
  for (const hint of legacyMatches) byKey.set(hint.key, hint);
  for (const hint of inferred) byKey.set(hint.key, hint);
  return [...byKey.values()];
}

export function buildHintContextText(hints: StructuredHintItem[]): string {
  if (!hints.length) return "";
  const lines = hints.map(
    (h) => `- ${h.key}: ${h.value} (confidence=${h.confidence.toFixed(2)}, source=${h.source})`,
  );
  return `[Structured hints]\n${lines.join("\n")}`;
}
