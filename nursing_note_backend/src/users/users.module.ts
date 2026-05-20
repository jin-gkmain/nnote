import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminVerificationController } from './admin-verification.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController, AdminVerificationController],
  exports: [UsersService],
})
export class UsersModule {}
