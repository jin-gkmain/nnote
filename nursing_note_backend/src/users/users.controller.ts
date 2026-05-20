import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

interface AuthedRequest extends Request {
  user: { userId: number; role: string; loginId: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  list() {
    return this.usersService.listAll();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch('me')
  patchMe(@Req() req: AuthedRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(
      req.user.userId,
      req.user.role === 'admin' ? 'admin' : 'user',
      dto,
    );
  }

  @Get('me/verification')
  getMyVerification(@Req() req: AuthedRequest) {
    return this.usersService.getMyVerification(req.user.userId);
  }

  @Post('me/verification-requests')
  createMyVerificationRequest(
    @Req() req: AuthedRequest,
    @Body() dto: CreateVerificationRequestDto,
  ) {
    return this.usersService.createMyVerificationRequest(
      req.user.userId,
      dto.department,
      dto.licenseNumber,
    );
  }

  @Patch(':id')
  @Roles('admin')
  adminPatchUser(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(req.user.userId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(req.user.userId, id);
  }
}
