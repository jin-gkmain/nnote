import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SttService } from './stt.service';

/**
 * STT 컨트롤러
 *
 * POST /api/stt — 음성 파일을 받아 텍스트로 변환
 *
 * 요청: multipart/form-data, 필드명 'audio'
 * 응답: { success: true, text: string, filename: string }
 */
@Controller('stt')
export class SttController {
  constructor(private readonly sttService: SttService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Body('stt_engine') sttEngine?: string,
  ) {
    if (!file) {
      throw new BadRequestException('음성 파일이 없습니다.');
    }

    const { text, filename, segments, speakers, meta } = await this.sttService.transcribe(
      file,
      sttEngine,
    );

    return {
      success: true,
      text,
      filename,
      segments,
      speakers,
      meta,
    };
  }
}
