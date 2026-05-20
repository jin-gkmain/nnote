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
      const keys =
        f.optionKeys && f.optionKeys.length > 0
          ? ` — allowedKeys: ${f.optionKeys.map((k) => `"${k}"`).join(', ')}`
          : '';
      return `  "${f.key}": ""  // ${f.label}${desc}${vt}${keys}`;
    });
    const hasChoiceFields = fields.some(
      (f) =>
        (f.valueType === 'radio' || f.valueType === 'selectbox' || f.valueType === 'checkbox') &&
        f.optionKeys &&
        f.optionKeys.length > 0,
    );
    const choiceRules = hasChoiceFields
      ? `
선택형 필드 규칙(valueType·allowedKeys가 붙은 항목):
- radio / selectbox: 값은 반드시 allowedKeys 중 **정확히 하나**와 동일한 문자열이거나, 정보가 없으면 빈 문자열("")입니다.
- checkbox: 값은 allowedKeys에 있는 키들만 쉼표(,)로 연결한 문자열이거나 빈 문자열("")입니다. (예: "키A,키B"). 순서는 자유이나 키는 allowedKeys만 사용합니다.
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
${choiceRules}
반드시 아래 키만 가진 JSON 객체 하나만 출력하세요 (키 이름과 순서는 유지):
{
${fieldLines.join(',\n')}
}

${hintGuide}

다른 설명·마크다운·코드펜스 없이 JSON만 출력하세요.`;
    const parsed = await this.callClovaApi(systemPrompt, text);
    const out: Record<string, string> = {};
    for (const f of fields) {
      const v = parsed[f.key];
      out[f.key] = this.normalizeTemplateFillValue(v, f);
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

  private normalizeTemplateFillValue(value: unknown, field: TemplateFieldSpecDto): string {
    if (value == null) return '';
    const text = String(value).trim();
    if (!text) return '';
    const vt = field.valueType;
    const keys = (field.optionKeys ?? [])
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0);
    const allowed = new Set(keys);
    if (vt === 'checkbox' && keys.length > 0) {
      const parts = text.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
      const kept = parts.filter((p) => allowed.has(p));
      return [...new Set(kept)].sort().join(',');
    }
    if ((vt === 'radio' || vt === 'selectbox') && keys.length > 0) {
      return allowed.has(text) ? text : '';
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
