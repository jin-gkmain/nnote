import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RecordsService } from './records.service';
import {
  CreateRecordDto,
  UpdateRecordDto,
  UpdateRecordEmrStatusDto,
} from './dto/create-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthedRequest extends Request {
  user: { userId: number; role: string; loginId: string };
}

/**
 * 통합 기록 API
 * - 모든 기록지(간호기록지/간호인계기록지/임상관찰기록지)를
 *   하나의 테이블(records)에 JSON으로 저장
 */
@Controller('records')
export class RecordsController {
  constructor(private readonly service: RecordsService) {}

  @Get()
  findPaged(
    @Query('page') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
    @Query('sort') rawSort?: string,
    @Query('search') rawSearch?: string,
  ) {
    const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(rawPageSize ?? '20', 10) || 20));
    return this.service.findPaged({
      page,
      pageSize,
      sort: rawSort ?? 'record_date_desc',
      search: rawSearch ?? '',
    });
  }

  /** 대시보드: 기록 중심 통계 */
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  /** 대시보드: 최근 생성 기록 */
  @Get('recent/created')
  findRecentCreated(@Query('limit') raw?: string) {
    const n = Math.min(50, Math.max(1, parseInt(raw ?? '10', 10) || 10));
    return this.service.findRecentCreated(n);
  }

  /** 대시보드: 최근 수정 기록 */
  @Get('recent/updated')
  findRecentUpdated(@Query('limit') raw?: string) {
    const n = Math.min(50, Math.max(1, parseInt(raw ?? '10', 10) || 10));
    return this.service.findRecentUpdated(n);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRecordDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Put(':id/emr-status')
  @UseGuards(JwtAuthGuard)
  updateEmrStatus(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordEmrStatusDto,
  ) {
    return this.service.updateEmrStatus(
      { userId: req.user.userId, role: req.user.role === 'admin' ? 'admin' : 'user' },
      id,
      dto.emrSyncStatus,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
