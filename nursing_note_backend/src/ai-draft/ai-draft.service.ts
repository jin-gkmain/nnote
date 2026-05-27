import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TemplateFieldSpecDto } from './dto/template-field-spec.dto';
import type { StructuredHintDto } from './dto/ai-draft-request.dto';

/**
 * AI 초안 작성 서비스
 *
 * CLOVA Studio LLM을 호출하여 간호 기록 텍스트를 구조화된 형식으로 변환
 * - SBAR: 간호인계기록지 (Situation, Background, Assessment, Recommendation)
 * - SOAPIE: 간호기록지 (Subjective, Objective, Assessment, Planning, Intervention, Evaluation)
 */
@Injectable()
export class AiDraftService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  /** LLM 응답 대기 최대 시간 (60초) */
  private readonly LLM_TIMEOUT = 60_000;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('CLOVA_API_URL', '');
    this.apiKey = this.configService.get<string>('CLOVA_API_SECRET_KEY', '');
  }

  // ─── SBAR 분석 (간호인계기록지) ────────────────────────────────

  async analyzeSbar(
    text: string,
    templateFields?: TemplateFieldSpecDto[],
  ): Promise<any> {
    this.validateConfig();

    let systemPrompt = `당신은 간호기록 분석 전문가입니다.
입력된 간호기록 텍스트를 분석하여 SBAR 형식의 구조화된 JSON 데이터로 변환해주세요.

## SBAR 추출 규칙:

1. **situation (S - 상황)**: 환자의 현재 상태, 주요 호소 내용, 관찰된 증상 등 현재 상황을 요약
2. **background (B - 배경)**: 입원 사유, 과거력, 현재 진행 중인 치료, 활력징후 등 배경 정보
3. **assessment (A - 사정)**: 간호사의 전문적 판단, 현재 상태에 대한 종합 평가
4. **recommendation (R - 권고)**: 향후 간호 계획, 모니터링 사항, 의사에게 보고할 내용

## 출력 형식:

반드시 아래 JSON 형식으로만 출력하세요. 다른 설명 없이 JSON만 출력하세요.

{
  "situation": "현재 상황 요약",
  "background": "배경 정보",
  "assessment": "사정/평가 내용",
  "recommendation": "권고 사항"
}

텍스트에서 명확하게 추출할 수 없는 항목은 빈 문자열("")로 처리하세요.`;
    systemPrompt = this.mergeTemplateFieldGuide(systemPrompt, templateFields);
    return this.callClovaApi(systemPrompt, text);
  }

  // ─── SOAPIE 분석 (간호기록지) ──────────────────────────────────

  async analyzeSoapie(
    text: string,
    templateFields?: TemplateFieldSpecDto[],
  ): Promise<any> {
    this.validateConfig();

    let systemPrompt = `당신은 간호기록 일지 분석 전문가입니다.
입력된 간호기록 텍스트를 분석하여 SOAPIE 형식의 구조화된 JSON 데이터로 변환해주세요.

## SOAPIE 추출 규칙:

1. **soapie_s (Subjective data, 주관적 자료)**: 환자가 직접 말한 내용
2. **soapie_o (Objective data, 객관적 자료)**: 측정 가능한 데이터 (활력징후, 검사결과 등)
3. **soapie_a (Assessment, 사정)**: 간호진단 또는 전문적 판단
4. **soapie_p (Planning, 계획)**: 앞으로 수행할 간호계획
5. **soapie_i (Intervention, 중재)**: 실제로 수행한 간호중재
6. **soapie_e (Evaluation, 평가)**: 간호중재의 효과 평가

## 출력 형식:

반드시 아래 JSON 형식으로만 출력하세요. 다른 설명 없이 JSON만 출력하세요.

{
  "record_date": "YYYY-MM-DD",
  "record_time": "HH:MM:SS",
  "problem_number": null,
  "nursing_content": "수행한 간호활동 전체 요약",
  "soapie_s": "주관적 자료 내용",
  "soapie_o": "객관적 자료 내용",
  "soapie_a": "사정 내용",
  "soapie_p": "계획 내용",
  "soapie_i": "중재 내용",
  "soapie_e": "평가 내용"
}

텍스트에서 명확하게 추출할 수 없는 항목은 빈 문자열("")로,
날짜/시간이 명시되지 않은 경우 null로 처리하세요.`;
    systemPrompt = this.mergeTemplateFieldGuide(systemPrompt, templateFields);
    return this.callClovaApi(systemPrompt, text);
  }

  // ─── 임상관찰기록지 초안 근거 추출 ───────────────────────────────

  async analyzeObservation(
    text: string,
    templateFields?: TemplateFieldSpecDto[],
  ): Promise<any> {
    this.validateConfig();

    let systemPrompt = `당신은 임상관찰기록지 검수 보조 전문가입니다.
입력 텍스트에서 "명시적으로 언급된 정보만" 구조화하여 JSON으로 출력하세요.

매우 중요한 규칙:
1) 추정/상식/추론으로 값을 만들지 마세요.
2) 텍스트에 명시되지 않은 값은 반드시 빈 문자열("")로 둡니다.
3) 값이 있으면 evidence(근거 문구)를 같이 넣습니다.
4) 활력징후의 measured_at은 해당 수치가 언급된 기록 시각이 명시된 경우에만 넣습니다.

출력 형식(JSON only):
{
  "department": { "value": "", "evidence": "" },
  "caregiverType": { "value": "", "evidence": "" },
  "catheterCare": { "value": "", "evidence": "" },
  "vitals": {
    "bloodPressure": { "value": "", "measured_at": "", "evidence": "" },
    "pulse": { "value": "", "measured_at": "", "evidence": "" },
    "temperature": { "value": "", "measured_at": "", "evidence": "" },
    "respiration": { "value": "", "measured_at": "", "evidence": "" },
    "spo2": { "value": "", "measured_at": "", "evidence": "" },
    "bloodSugar": { "value": "", "measured_at": "", "evidence": "" }
  }
}`;

    systemPrompt = this.mergeObservationFieldHints(systemPrompt, templateFields);
    return this.callClovaApi(systemPrompt, text);
  }

  /**
   * OCR 등: 화면 템플릿의 필드 키·라벨·설명 그대로 전달하고, 동일 키의 JSON만 받음.
   */
  async analyzeTemplateFill(
    text: string,
    fields: TemplateFieldSpecDto[],
    structuredHints?: StructuredHintDto[],
  ): Promise<Record<string, string>> {
    this.validateConfig();
    if (!fields?.length) {
      throw new BadRequestException('template_fill에는 templateFields가 필요합니다.');
    }
    const fieldLines = fields.map((f) => {
      const desc = f.description ? ` — ${f.description}` : '';
      const vt = f.valueType ? ` [valueType=${f.valueType}]` : '';
      const sources =
        f.inputSources && f.inputSources.length > 0
          ? ` — inputSources: ${f.inputSources.join(', ')}`
          : '';
      const decisionGuide =
        f.aiHint || f.sourceDefinition
          ? ` — 판단 기준: ${f.aiHint || f.sourceDefinition}`
          : '';
      const keys =
        f.optionKeys && f.optionKeys.length > 0
          ? ` — allowedKeys: ${this.formatOptionGuide(f)}`
          : '';
      return `  "${f.key}": ""  // ${f.label}${desc}${vt}${sources}${keys}${decisionGuide}`;
    });
    const hasChoiceFields = fields.some(
      (f) =>
        (f.valueType === 'single_select' || f.valueType === 'multi_select') &&
        f.optionKeys &&
        f.optionKeys.length > 0,
    );
    const choiceRules = hasChoiceFields
      ? `
선택형 필드 규칙(valueType·allowedKeys가 붙은 항목):
- single_select: 값은 반드시 allowedKeys 중 **정확히 하나**와 동일한 문자열이거나, 정보가 없으면 빈 문자열("")입니다.
- multi_select: 값은 allowedKeys에 있는 키들만 쉼표(,)로 연결한 문자열이거나 빈 문자열("")입니다. (예: "키A,키B"). 순서는 자유이나 키는 allowedKeys만 사용합니다.
- allowedKeys에 없는 표현은 임의로 새 선택지를 만들지 말고, 명확히 대응되지 않으면 빈 문자열("")로 둡니다.
- inputSources에 STT가 없는 필드는 STT 원문만으로는 채우지 말고, 원문에 명시 근거가 있을 때만 채웁니다.
- 원문에 해당 항목이 언급되지 않았고 allowedKeys에 "없음", "해당 없음" 또는 "기본"이라고 표시된 옵션이 있으면 그 값을 기본값으로 사용합니다.
- "있음"은 원문에 해당 증상/병력/상태가 명시적으로 있을 때만 선택합니다. 언급이 없으면 "있음"을 선택하지 마세요.
- "가족력", "알레르기", "호흡기 증상", "부종", "종교", "흡연/음주", "보호자", "퇴원 예정"처럼 대화에 나오지 않은 항목은 추측하지 말고 기본값/없음/공백으로 둡니다.
- 상위 항목이 "없음" 또는 공백인 경우 하위 상세 항목은 반드시 공백입니다.
`
      : '';
    const hasNumberFields = fields.some((f) => f.valueType === 'number');
    const numberRules = hasNumberFields
      ? `
숫자 필드 규칙(valueType=number):
- 값은 브라우저 숫자 입력칸에 들어갈 수 있는 단일 숫자만 사용합니다. "5-6", "5/6", "3점" 같은 범위·단위·서술형 문자열은 쓰지 않습니다.
- 원문이 범위나 후보값으로 말한 경우 가장 임상적으로 의미 있는 단일 숫자로 정리합니다. 통증 강도는 언급된 숫자 중 더 큰 값을 사용합니다.
- 근거 숫자가 원문에 없으면 빈 문자열("")로 둡니다.
`
      : '';
    const hintLines = (structuredHints ?? [])
      .filter((h) => h && h.key && h.value)
      .map((h) => `- ${h.key}: ${h.value} (confidence=${Number(h.confidence ?? 0).toFixed(2)}, source=${h.source ?? 'input'})`)
      .join('\n');
    const hintGuide = hintLines
      ? `\n[규칙 기반 사전 매칭 힌트]\n${hintLines}\n위 힌트는 우선 반영하되, 원문과 충돌하면 원문을 우선하세요.\n`
      : '';
    const systemPrompt = `당신은 간호 기록 작성 보조 전문가입니다.
아래 원문 텍스트만 근거로 각 필드를 채웁니다. 원문에 없는 정보는 추측하지 말고 반드시 빈 문자열("")로 둡니다.
이 요청은 "신규 생성(환자 기본정보+메모)" 또는 "기록 기반 생성(이전 기록 텍스트)" 중 하나일 수 있으며, 전달된 원문 밖의 사실은 만들지 않습니다.
각 필드 주석의 "판단 기준"은 해당 필드를 채워도 되는 근거와 해석 기준입니다. 판단 기준과 원문 근거가 맞지 않으면 값을 만들지 말고 빈 문자열("")로 둡니다.
환자 성별·나이·보호자·과거력·가족력·알레르기·생활습관·종교·퇴원정보·신체계통 증상은 원문에 직접 말한 경우에만 채웁니다.
${choiceRules}
${numberRules}
반드시 아래 키만 가진 JSON 객체 하나만 출력하세요 (키 이름과 순서는 유지):
{
${fieldLines.join(',\n')}
}

${hintGuide}

다른 설명·마크다운·코드펜스 없이 JSON만 출력하세요.`;
    const parsed = await this.callClovaApi(systemPrompt, text);
    const out: Record<string, string> = {};
    const evidenceText = this.extractEvidenceText(text);
    for (const f of fields) {
      const v = parsed[f.key];
      out[f.key] = this.normalizeTemplateFillValue(v, f, evidenceText);
    }
    return out;
  }

  /**
   * 음성 STT 원문에서 여러 기록지가 공통으로 쓸 구조화 요약·사실만 추출 (추측 금지).
   * 실패 시 빈 구조를 반환해 이후 template_fill이 원문만으로 동작하도록 함.
   */
  async analyzeTranscriptDigest(text: string): Promise<Record<string, unknown>> {
    this.validateConfig();
    const systemPrompt = `당신은 간호 음성 기록(STT 원문) 분석 보조 전문가입니다.
입력은 간호사·환자 대화 등 STT 결과일 수 있습니다.

## 규칙
1) 원문에 **명시된 사실만** 구조화합니다. 추정·상식으로 값을 채우지 마세요.
2) 불확실하면 빈 문자열("") 또는 빈 배열([])을 사용합니다.
3) evidence에는 가능하면 원문 인용(짧게)을 넣고, 없으면 ""입니다.

## 출력(JSON만, 마크다운·코드펜스 없음)
{
  "summary": "원문 전체를 한두 문장으로 요약(근거 없는 추측 금지)",
  "facts": [
    {
      "label": "사실 유형 한글 라벨(예: 통증, 투약, 배설)",
      "value": "추출 값",
      "evidence": "원문 인용",
      "category": "symptom|vital|medication|intake_output|care|time|other"
    }
  ],
  "vitals": {
    "bloodPressure": "",
    "pulse": "",
    "temperature": "",
    "respiration": "",
    "spo2": "",
    "bloodSugar": ""
  },
  "mentionedTimes": ["원문에 나온 시각·상대시간 표현 문자열"],
  "narrativeBullets": ["기록에 넣을 만한 짧은 불릿(원문 근거)"]
}`;
    try {
      const parsed = await this.callClovaApi(systemPrompt, text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return this.emptyTranscriptDigest();
      }
      return parsed as Record<string, unknown>;
    } catch (err) {
      console.warn('[transcript_digest] LLM 실패, 빈 digest 반환:', err);
      return this.emptyTranscriptDigest();
    }
  }

  private emptyTranscriptDigest(): Record<string, unknown> {
    return {
      summary: '',
      facts: [],
      vitals: {
        bloodPressure: '',
        pulse: '',
        temperature: '',
        respiration: '',
        spo2: '',
        bloodSugar: '',
      },
      mentionedTimes: [],
      narrativeBullets: [],
    };
  }

  private normalizeTemplateFillValue(
    value: unknown,
    field: TemplateFieldSpecDto,
    evidenceText = '',
  ): string {
    const vt = field.valueType;
    const keys = (field.optionKeys ?? [])
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0);
    const allowed = new Set(keys);
    if (value == null) {
      if (
        (vt === 'single_select' || vt === 'multi_select') &&
        keys.length > 0
      ) {
        return this.defaultChoiceValue(field);
      }
      return '';
    }
    const text = String(value).trim();
    if (!text) {
      if (vt === 'single_select' && keys.length > 0) return this.defaultChoiceValue(field);
      if (vt === 'multi_select' && keys.length > 0) return this.defaultChoiceValue(field);
      return '';
    }
    if (vt === 'multi_select' && keys.length > 0) {
      const parts = text.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
      const kept = parts.filter((p) => allowed.has(p));
      return [...new Set(kept)]
        .filter((p) => this.hasChoiceEvidence(p, field, evidenceText))
        .sort()
        .join(',');
    }
    if (vt === 'single_select' && keys.length > 0) {
      if (!allowed.has(text)) return '';
      if (this.hasChoiceEvidence(text, field, evidenceText)) {
        return text;
      }
      return this.defaultChoiceValue(field);
    }
    if (this.isGenericPlaceholderValue(text, field, evidenceText)) {
      return '';
    }
    if (vt === 'number') {
      if (!/\d/.test(text) || !this.hasNumberEvidence(text, evidenceText)) {
        return '';
      }
      return this.normalizeNumberTemplateValue(text, field);
    }
    const lowerLabel = `${field.key} ${field.label}`.toLowerCase();
    if (/(혈압|blood pressure|bp)/i.test(lowerLabel)) {
      const m = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (m) return `${m[1]}/${m[2]}`;
    }
    if (/(혈당|blood sugar|glucose)/i.test(lowerLabel)) {
      const m = text.match(/(\d{2,3}(?:\.\d+)?)/);
      if (m) return m[1];
    }
    return text;
  }

  private formatOptionGuide(field: TemplateFieldSpecDto): string {
    if (field.options?.length) {
      return field.options
        .map((o) => {
          const key = String(o.optionKey ?? '').trim();
          const label = String(o.label ?? '').trim();
          return label && label !== key ? `"${key}"(${label})` : `"${key}"`;
        })
        .join(', ');
    }
    return (field.optionKeys ?? []).map((k) => `"${k}"`).join(', ');
  }

  private extractEvidenceText(text: string): string {
    const marker = '[음성 STT 원문]';
    const idx = text.indexOf(marker);
    const raw = idx >= 0 ? text.slice(idx + marker.length) : text;
    const nextMarker = raw.search(/\n\s*\[/);
    return (nextMarker >= 0 ? raw.slice(0, nextMarker) : raw)
      .replace(/\s+/g, ' ')
      .trim();
  }

  private optionLabel(field: TemplateFieldSpecDto, key: string): string {
    const option = field.options?.find((o) => String(o.optionKey ?? '').trim() === key);
    return String(option?.label ?? key).trim();
  }

  private defaultChoiceValue(field: TemplateFieldSpecDto): string {
    const options = field.options ?? [];
    const byDefault = options.find((o) =>
      /기본/.test(`${o.optionKey ?? ''} ${o.label ?? ''}`),
    );
    if (byDefault?.optionKey) return String(byDefault.optionKey).trim();

    const byNone = options.find((o) =>
      /^(없음|해당\s*없음|무)$/.test(String(o.optionKey ?? '').trim()) ||
      /^(없음|해당\s*없음|무)$/.test(String(o.label ?? '').trim()),
    );
    if (byNone?.optionKey) return String(byNone.optionKey).trim();

    const keys = field.optionKeys ?? [];
    return keys.find((k) => /^(없음|해당\s*없음|무)$/.test(String(k).trim())) ?? '';
  }

  private hasChoiceEvidence(
    selectedKey: string,
    field: TemplateFieldSpecDto,
    evidenceText: string,
  ): boolean {
    const source = evidenceText.replace(/\s+/g, ' ').trim();
    if (!source) return false;

    const defaultValue = this.defaultChoiceValue(field);
    if (selectedKey === defaultValue) return true;

    const label = this.optionLabel(field, selectedKey);
    const fieldText = `${field.key} ${field.label} ${field.description ?? ''} ${field.aiHint ?? ''} ${field.sourceDefinition ?? ''}`;
    if (this.includesMeaningfulTerm(source, selectedKey) || this.includesMeaningfulTerm(source, label)) {
      return true;
    }

    if (/통증|통증부위|통증양상|pain/i.test(fieldText)) {
      return /(통증|아프|아파|아픈|욱신|쑤시|쑤심|당기|땅기|찌르|저리|불편|수술\s*부위)/i.test(source);
    }
    if (/수면|잠|sleep/i.test(fieldText)) {
      return /(잠|수면|깼|깨다|못\s*잤|불면)/i.test(source);
    }
    if (/오심|구토|구역|nausea|vomit/i.test(fieldText)) {
      return /(오심|구역|메스꺼|구토|토했)/i.test(source);
    }
    if (/호흡|객담|기침|숨|respir/i.test(fieldText)) {
      if (/기침/.test(source) && /통증|아프|점|올라가|심하/i.test(source)) {
        return false;
      }
      return /(호흡|숨|기침|객담|가래|숨차|호흡곤란)/i.test(source);
    }
    if (/부종|edema/i.test(fieldText)) {
      return /(부종|붓|부었|붓기|edema)/i.test(source);
    }
    if (/가족력|family/i.test(fieldText)) {
      return /(가족력|가족.*병|부모.*병|형제.*병)/i.test(source);
    }
    if (/알레르|allerg/i.test(fieldText)) {
      return /(알레르|allerg|두드러기|아나필락|약.*부작용|음식.*못)/i.test(source);
    }
    if (/종교|relig/i.test(fieldText)) {
      return /(종교|기독교|천주교|불교|원목|목사|신부|법사)/i.test(source);
    }
    if (/흡연|smok/i.test(fieldText)) {
      return /(흡연|담배|smok)/i.test(source);
    }
    if (/음주|drink|alcohol/i.test(fieldText)) {
      return /(음주|술|drink|alcohol)/i.test(source);
    }
    if (/소화기|연하|오심|구토|복부|속쓰림|토혈|삼킴/i.test(fieldText)) {
      return /(소화|연하|삼키|오심|구토|토했|메스꺼|복부|속쓰림|토혈|복수|복부팽만)/i.test(source);
    }
    if (/보호자|퇴원|교통|caregiver|discharge/i.test(fieldText)) {
      return /(보호자|배우자|자녀|퇴원|귀가|자택|구급차|자가|대중교통)/i.test(source);
    }

    return false;
  }

  private includesMeaningfulTerm(source: string, term: string): boolean {
    const t = String(term).trim();
    if (!t || t.length < 2) return false;
    if (/^(있음|없음|예|아니오|yes|no|기타)$/i.test(t)) return false;
    return source.includes(t);
  }

  private hasNumberEvidence(value: string, evidenceText: string): boolean {
    const numbers = value.match(/\d+(?:\.\d+)?/g) ?? [];
    if (!numbers.length) return true;
    return numbers.some((n) => evidenceText.includes(n));
  }

  private normalizeNumberTemplateValue(
    value: string,
    field: TemplateFieldSpecDto,
  ): string {
    const numbers = value.match(/-?\d+(?:\.\d+)?/g) ?? [];
    if (!numbers.length) return '';
    const trimmed = value.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return trimmed;

    const fieldText = `${field.key} ${field.label}`.toLowerCase();
    if (/(통증|pain|npis|nrs|강도|점수|score)/i.test(fieldText)) {
      const finite = numbers
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      if (finite.length > 0) {
        return String(Math.max(...finite));
      }
    }
    return numbers[0] ?? '';
  }

  private isGenericPlaceholderValue(
    value: string,
    field: TemplateFieldSpecDto,
    evidenceText: string,
  ): boolean {
    const v = value.trim();
    if (!v) return false;
    const fieldName = field.label.split('·').pop()?.trim() ?? field.label;
    const metadataValues = [
      fieldName,
      field.label,
      field.key,
      field.description,
      field.aiHint,
      field.sourceDefinition,
    ]
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
    if (metadataValues.some((item) => v === item || item.includes(v) || v.includes(item))) {
      return !this.includesMeaningfulTerm(evidenceText, v);
    }
    if (/^(있음|기타|악화요인|완화요인|증상 시작시기|약물명\/1회 투여량\/1회 투여단위\/횟수\/용법 및 투여시간\/약품 코드\/유효함량)$/i.test(v)) {
      return !this.includesMeaningfulTerm(evidenceText, v);
    }
    return false;
  }

  private mergeTemplateFieldGuide(
    basePrompt: string,
    fields: TemplateFieldSpecDto[] | undefined,
  ): string {
    if (!fields?.length) {
      return basePrompt;
    }
    const lines = fields
      .map((f) => {
        const desc = f.description ? ` — ${f.description}` : '';
        return `- **${f.key}** (${f.label})${desc}`;
      })
      .join('\n');
    return `${basePrompt}

## 템플릿 필드 정의 (각 키의 의미를 반영해 JSON에 채우세요)
${lines}
`;
  }

  private mergeObservationFieldHints(
    basePrompt: string,
    fields: TemplateFieldSpecDto[] | undefined,
  ): string {
    if (!fields?.length) {
      return basePrompt;
    }
    const lines = fields
      .map((f) => {
        const desc = f.description ? ` ${f.description}` : '';
        return `- ${f.label} (\`${f.key}\`):${desc}`;
      })
      .join('\n');
    return `${basePrompt}

## 필드별 참고 (원문에 명시된 경우에만 추출; 없으면 빈 값)
${lines}
`;
  }

  // ─── 공통: CLOVA API 호출 ──────────────────────────────────────

  private validateConfig() {
    if (!this.apiUrl || !this.apiKey) {
      throw new BadRequestException(
        'CLOVA API 설정이 되어있지 않습니다. .env 파일의 CLOVA_API_URL, CLOVA_API_SECRET_KEY를 확인하세요.',
      );
    }
  }

  /**
   * CLOVA Studio LLM API 호출
   *
   * @param systemPrompt - 시스템 프롬프트 (분석 유형별 지시문)
   * @param userText - 사용자가 입력한 간호 기록 텍스트
   * @returns 파싱된 JSON 객체
   */
  private async callClovaApi(systemPrompt: string, userText: string): Promise<any> {
    console.log(`🤖 CLOVA LLM 호출 — 입력 텍스트 ${userText.length}자`);

    // AbortController로 타임아웃 구현
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.LLM_TIMEOUT);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'HCX-DASH-002',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText },
          ],
          temperature: 0.2,  // 낮은 온도 → 일관성 있는 출력
          max_tokens: 3000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('CLOVA API 오류:', response.status, errorText);
        throw new BadRequestException(`LLM 분석 실패 (${response.status})`);
      }

      const result = await response.json();
      let content = result.choices?.[0]?.message?.content;

      if (!content) {
        console.error('LLM 응답에 content가 없음:', result);
        throw new BadRequestException('LLM이 유효한 응답을 생성하지 못했습니다.');
      }

      // 마크다운 코드 블록 제거 (LLM이 ```json ... ``` 으로 감쌀 수 있음)
      content = content
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();

      // JSON 파싱
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.error('JSON 파싱 실패:', content);
        throw new BadRequestException('LLM 응답을 JSON으로 파싱할 수 없습니다.');
      }

      console.log('✅ LLM 분석 완료');
      return parsed;
    } catch (error) {
      clearTimeout(timeout);

      // AbortError → 타임아웃
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException(`요청 타임아웃 (${this.LLM_TIMEOUT}ms 초과)`);
      }

      // 이미 BadRequestException이면 그대로 throw
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'LLM 분석 중 오류 발생',
      );
    }
  }
}
