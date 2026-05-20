import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 prefix: 모든 엔드포인트가 /api/... 로 시작
  app.setGlobalPrefix('api');

  // DTO 유효성 검사 파이프 — class-validator 데코레이터가 자동 적용됨
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 필드 자동 제거
      transform: true, // 요청 데이터를 DTO 클래스 인스턴스로 자동 변환
    }),
  );

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`✅ NestJS API 서버 실행 중: http://localhost:${port}`);
}

bootstrap();
