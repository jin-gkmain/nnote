import { IsNumber, IsString, IsOptional, IsObject, IsIn, MaxLength } from 'class-validator';

/**
 * 통합 기록 생성 DTO
 * - data: JSON 객체(중첩/한글 키 허용). 없으면 {}로 저장
 */
export class CreateRecordDto {
  @IsNumber()
  patientId: number;

  @IsString()
  recordType: string;

  @IsString()
  documentNumber: string;

  @IsString()
  recordDate: string;

  @IsString()
  recordTime: string;

  /** 사용자 지정 기록 제목 */
  @IsString()
  @MaxLength(512)
  title: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  /** manual | voice | ai | ocr — 대시보드 통계용 */
  @IsOptional()
  @IsIn(['manual', 'voice', 'ai', 'ocr'])
  creationSource?: 'manual' | 'voice' | 'ai' | 'ocr';
}

export class UpdateRecordDto {
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsString() recordDate?: string;
  @IsOptional() @IsString() recordTime?: string;
  @IsOptional() @IsString() @MaxLength(512) title?: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
}

export class UpdateRecordEmrStatusDto {
  @IsIn(['pending', 'sent'])
  emrSyncStatus: 'pending' | 'sent';
}
