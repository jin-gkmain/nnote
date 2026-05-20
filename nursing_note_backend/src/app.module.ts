import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PatientsModule } from './patients/patients.module';
import { RecordsModule } from './records/records.module';
import { OcrModule } from './ocr/ocr.module';
import { AiDraftModule } from './ai-draft/ai-draft.module';
import { SttModule } from './stt/stt.module';
import { TemplateUiModule } from './template-ui/template-ui.module';
import { UsersModule } from './users/users.module';
import { AbbreviationsModule } from './settings/abbreviations.module';
import { AiSearchModule } from './ai-search/ai-search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve(__dirname, '../.env'),
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    TemplateUiModule,
    AbbreviationsModule,
    PatientsModule,
    RecordsModule,
    OcrModule,
    AiDraftModule,
    AiSearchModule,
    SttModule,
  ],
})
export class AppModule {}
