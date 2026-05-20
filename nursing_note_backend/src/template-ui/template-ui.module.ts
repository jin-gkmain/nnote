import { Module } from '@nestjs/common';
import { TemplateUiController } from './template-ui.controller';
import { TemplateUiService } from './template-ui.service';

@Module({
  controllers: [TemplateUiController],
  providers: [TemplateUiService],
  exports: [TemplateUiService],
})
export class TemplateUiModule {}
