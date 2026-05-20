import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OCR 서비스
 *
 * Naver Cloud OCR API를 호출하여 이미지에서 텍스트를 추출
 * - 이미지를 Base64로 변환 → Naver API에 전달 → 텍스트 반환
 */
@Injectable()
export class OcrService {
  private readonly apiUrl: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('NAVER_OCR_API_URL', '');
    this.secretKey = this.configService.get<string>('NAVER_OCR_SECRET_KEY', '');
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    if (!this.apiUrl || !this.secretKey) {
      throw new BadRequestException(
        'Naver OCR API 설정이 되어있지 않습니다. .env 파일을 확인하세요.',
      );
    }

    // 파일 확장자 추출
    const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const format = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'pdf'].includes(extension)
      ? extension
      : 'jpg';

    // 이미지를 Base64로 변환
    const base64Image = file.buffer.toString('base64');

    // Naver Cloud OCR API 요청 본문
    const requestBody = {
      version: 'V2',
      requestId: `ocr-${Date.now()}`,
      timestamp: Date.now(),
      lang: 'ko',
      images: [
        {
          format,
          name: file.originalname,
          data: base64Image,
        },
      ],
    };

    console.log(`📄 OCR 요청 — 파일: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

    // Naver Cloud OCR API 호출
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OCR-SECRET': this.secretKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Naver OCR API 오류:', response.status, errorText);
      throw new BadRequestException(`OCR 처리 실패 (${response.status})`);
    }

    const result = await response.json();

    // OCR 결과에서 텍스트 추출
    let fullText = '';
    if (result.images?.length > 0) {
      const image = result.images[0];
      if (image.fields?.length > 0) {
        fullText = image.fields
          .map((field: any) => field.inferText)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    console.log(`✅ OCR 완료 — ${fullText.length}자 추출`);
    return fullText;
  }
}
