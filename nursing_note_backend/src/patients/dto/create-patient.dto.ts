import { IsString, IsEnum, IsOptional } from 'class-validator';

/**
 * 환자 등록 DTO (Data Transfer Object)
 *
 * DTO란?
 * - 클라이언트가 보내는 요청 데이터의 "형태"를 정의하는 클래스
 * - class-validator 데코레이터로 유효성 검사가 자동 수행됨
 * - 잘못된 데이터가 들어오면 NestJS가 400 에러를 자동 반환
 */
export class CreatePatientDto {
  @IsString()
  patientNumber: string;

  @IsString()
  name: string;

  @IsString()
  birthDate: string; // "YYYY-MM-DD"

  @IsEnum(['남', '여'])
  gender: '남' | '여';

  @IsString()
  roomNumber: string;

  @IsString()
  diagnosis: string;

  @IsString()
  admissionDate: string; // "YYYY-MM-DD"

  @IsString()
  attendingDoctor: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsString()
  bloodType: string;

  @IsString()
  insurance: string;

  @IsString()
  emergencyContact: string;
}
