import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AiDraftService } from './ai-draft.service';
import { AiDraftRequestDto } from './dto/ai-draft-request.dto';

/**
 * AI 초안 작성 컨트롤러
 *
 * POST /api/ai-draft — 간호 기록 텍스트를 LLM으로 분석
 *
 * 요청 본문:
 *   { text: string, type: '...' | 'transcript_digest' | 'template_fill', templateFields?: [...] }
 *
 * - templateFields: 각 필드 key·label·description을 넣으면 프롬프트에 반영 (OCR 템플릿 채우기·AI기록생성 공통)
 * - template_fill: templateFields 필수, 화면 필드 키와 동일한 문자열 JSON만 반환
 */
@Controller('ai-draft')
export class AiDraftController {
  constructor(private readonly aiDraftService: AiDraftService) {}

  @Post()
  async generateDraft(@Body() body: AiDraftRequestDto) {
    const { text, type, templateFields, structuredHints } = body;

    if (!text || text.trim() === '') {
      throw new BadRequestException('분석할 텍스트가 없습니다.');
    }

    if (
      !type ||
      !['sbar', 'soapie', 'observation', 'template_fill', 'transcript_digest'].includes(type)
    ) {
      throw new BadRequestException(
        'type은 "sbar", "soapie", "observation", "template_fill", "transcript_digest" 중 하나여야 합니다.',
      );
    }

    if (type === 'transcript_digest') {
      const data = await this.aiDraftService.analyzeTranscriptDigest(text);
      return {
        success: true,
        type,
        data,
      };
    }

    if (type === 'template_fill') {
      if (!templateFields?.length) {
        throw new BadRequestException(
          'template_fill 유형에는 templateFields 배열이 필요합니다.',
        );
      }
      const data = await this.aiDraftService.analyzeTemplateFill(
        text,
        templateFields,
        structuredHints,
      );
      return {
        success: true,
        type,
        data,
      };
    }

    const data =
      type === 'sbar'
        ? await this.aiDraftService.analyzeSbar(text, templateFields)
        : type === 'soapie'
          ? await this.aiDraftService.analyzeSoapie(text, templateFields)
          : await this.aiDraftService.analyzeObservation(text, templateFields);

    return {
      success: true,
      type,
      data,
    };
  }
}
