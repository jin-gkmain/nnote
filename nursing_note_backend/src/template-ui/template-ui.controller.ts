import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTemplateUiTemplateDto } from './dto/create-template-ui-template.dto';
import { UpdateTemplateUiDto } from './dto/update-template-ui.dto';
import { TemplateUiService } from './template-ui.service';

@Controller('settings/template-ui')
export class TemplateUiController {
  constructor(private readonly templateUiService: TemplateUiService) {}

  /** 음성/OCR 등에서 기본 레지스트리와 병합 (인증 불필요) */
  @Get()
  findAll() {
    return this.templateUiService.findAll();
  }

  @Get('presets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listPresets() {
    return this.templateUiService.listPresets();
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createTemplate(@Body() dto: CreateTemplateUiTemplateDto) {
    return this.templateUiService.createTemplate(dto);
  }

  @Put(':templateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  upsert(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateUiDto,
  ) {
    return this.templateUiService.upsert(decodeURIComponent(templateId), dto);
  }

  @Delete(':templateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('templateId') templateId: string) {
    return this.templateUiService.deleteTemplate(decodeURIComponent(templateId));
  }
}
