import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';

/**
 * OCR 컨트롤러
 *
 * POST /api/ocr — 이미지 파일을 받아 텍스트를 추출
 *
 * @UseInterceptors(FileInterceptor('file'))
 * → multipart/form-data 요청에서 'file' 필드를 파싱
 * → 파일 정보가 @UploadedFile()로 주입됨
 */
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async processOcr(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    const fullText = await this.ocrService.extractText(file);

    return {
      success: true,
      fullText,
    };
  }
}
