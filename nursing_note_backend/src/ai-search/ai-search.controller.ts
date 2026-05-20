import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type AutocompleteRequestDto,
  validateAutocompleteRequest,
} from './autocomplete.dto';
import { AiSearchService } from './ai-search.service';

interface AuthedRequest extends Request {
  user: { userId: number };
}

@Controller('ai-search')
@UseGuards(JwtAuthGuard)
export class AiSearchController {
  constructor(private readonly aiSearchService: AiSearchService) {}

  @Post('autocomplete')
  autocomplete(@Req() req: AuthedRequest, @Body() dto: AutocompleteRequestDto) {
    validateAutocompleteRequest(dto);
    return this.aiSearchService.suggest(dto, req.user.userId);
  }
}
