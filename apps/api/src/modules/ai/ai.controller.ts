import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { CreateAiDocumentDto } from './dto/create-ai-document.dto';
import { DeleteAiDocumentsDto } from './dto/delete-ai-documents.dto';
import { ExtractAiDocumentDto } from './dto/extract-ai-document.dto';
import { ListAiDocumentsDto } from './dto/list-ai-documents.dto';
import { RespondAiAssistantDto } from './dto/respond-ai-assistant.dto';
import { UpdateAiDocumentClassificationDto } from './dto/ai-document-classification.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('documents')
  @ApiOperation({ summary: 'List AI documents for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  async listDocuments(@CurrentUser() user: RequestUser, @Query() query: ListAiDocumentsDto) {
    this.requireOrgContext(user);
    return this.aiService.listDocuments(user, query);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get an AI document and recent extraction runs' })
  async getDocument(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireOrgContext(user);
    return this.aiService.getDocument(user, id);
  }

  @Post('documents')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an engineering report for AI indexing and extraction' })
  async createDocument(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAiDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.requireOrgContext(user);
    if (!file) {
      throw new ForbiddenException('File is required');
    }
    return this.aiService.createDocument(user, dto, file);
  }

  @Delete('documents')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete selected or all AI documents for a project' })
  async deleteDocuments(@CurrentUser() user: RequestUser, @Body() dto: DeleteAiDocumentsDto) {
    this.requireOrgContext(user);
    return this.aiService.deleteDocuments(user, dto);
  }

  @Delete('documents/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete one AI document' })
  async deleteDocument(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireOrgContext(user);
    return this.aiService.deleteDocument(user, id);
  }

  @Patch('documents/:id/classification')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update AI document registry classification' })
  async updateDocumentClassification(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiDocumentClassificationDto,
  ) {
    this.requireOrgContext(user);
    return this.aiService.updateDocumentClassification(user, id, dto);
  }

  @Post('documents/:id/index')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Upload an AI document to OpenAI and attach it to a vector store' })
  async indexDocument(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    this.requireOrgContext(user);
    return this.aiService.indexDocument(user, id);
  }

  @Post('documents/:id/extract')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Run structured extraction against an indexed AI document' })
  async extractDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtractAiDocumentDto,
  ) {
    this.requireOrgContext(user);
    return this.aiService.extractDocument(user, id, dto);
  }

  @Post('assistant/respond')
  @ApiOperation({
    summary: 'Return a read-only, context-aware assistant response for the current app page',
  })
  async respondToAssistant(@CurrentUser() user: RequestUser, @Body() dto: RespondAiAssistantDto) {
    this.requireOrgContext(user);
    return this.aiService.respondToAssistant(user, dto);
  }

  private requireOrgContext(
    user: RequestUser,
  ): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }
  }
}
