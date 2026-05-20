import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RejectVerificationRequestDto } from './dto/reject-verification-request.dto';
import { UsersService } from './users.service';

interface AuthedRequest extends Request {
  user: { userId: number; role: string; loginId: string };
}

@Controller('admin/verification-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminVerificationController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query('status') status?: string) {
    const normalized =
      status === 'pending' || status === 'approved' || status === 'rejected'
        ? (status as 'pending' | 'approved' | 'rejected')
        : undefined;
    return this.usersService.adminListVerificationRequests({
      status: normalized,
    });
  }

  @Post(':id/approve')
  approve(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.adminApproveVerificationRequest(id, req.user.userId);
  }

  @Post(':id/reject')
  reject(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectVerificationRequestDto,
  ) {
    return this.usersService.adminRejectVerificationRequest(
      id,
      req.user.userId,
      dto.reason,
    );
  }
}

