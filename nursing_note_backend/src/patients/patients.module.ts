import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

/**
 * 환자 모듈
 *
 * NestJS 모듈은 관련된 Controller + Service를 묶는 단위
 * AppModule에서 import하면 자동으로 라우트가 등록됨
 */
@Module({
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
