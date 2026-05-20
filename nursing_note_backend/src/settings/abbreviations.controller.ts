import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type UpdateAbbreviationsDto } from './abbreviations.dto';
import { AbbreviationsService } from './abbreviations.service';

interface AuthedRequest extends Request {
  user: { userId: number; role: string; loginId: string };
}

@Controller('settings/abbreviations')
@UseGuards(JwtAuthGuard)
export class AbbreviationsController {
  constructor(private readonly abbreviationsService: AbbreviationsService) {}

  @Get('me')
  getMine(@Req() req: AuthedRequest) {
    return this.abbreviationsService.getByUserId(req.user.userId);
  }

  @Put('me')
  upsertMine(@Req() req: AuthedRequest, @Body() dto: UpdateAbbreviationsDto) {
    return this.abbreviationsService.upsertByUserId(req.user.userId, dto);
  }
}
