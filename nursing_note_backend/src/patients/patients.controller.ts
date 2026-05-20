import {
  Controller,
  Get, Post, Put, Patch,
  Param, Body,
  ParseIntPipe,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

/**
 * 환자 컨트롤러
 *
 * NestJS 컨트롤러는 HTTP 요청을 받아서 → Service에 위임 → 응답 반환
 * 비즈니스 로직은 여기에 쓰지 않고, Service에서 처리
 *
 * @Controller('patients') → /api/patients 경로로 매핑
 * (main.ts에서 setGlobalPrefix('api')를 설정했으므로)
 */
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // GET /api/patients — 활성 환자 목록
  @Get()
  findAll() {
    return this.patientsService.findAll();
  }

  // GET /api/patients/stats — 대시보드 통계
  // 주의: :id 보다 위에 선언해야 'stats'가 id로 해석되지 않음
  @Get('stats')
  getStats() {
    return this.patientsService.getStats();
  }

  // GET /api/patients/:id — 환자 상세
  // ParseIntPipe: URL 파라미터를 자동으로 number로 변환
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.findOne(id);
  }

  // POST /api/patients — 환자 등록
  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  // PUT /api/patients/:id — 환자 정보 수정
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto);
  }

  // PATCH /api/patients/:id/discharge — 퇴원 처리
  @Patch(':id/discharge')
  discharge(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.discharge(id);
  }

  // GET /api/patients/:id/records — 환자별 통합 기록 조회
  @Get(':id/records')
  findRecords(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.findRecords(id);
  }
}
