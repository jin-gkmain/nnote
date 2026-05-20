import { Module } from '@nestjs/common';
import { AbbreviationsController } from './abbreviations.controller';
import { AbbreviationsService } from './abbreviations.service';

@Module({
  controllers: [AbbreviationsController],
  providers: [AbbreviationsService],
  exports: [AbbreviationsService],
})
export class AbbreviationsModule {}
