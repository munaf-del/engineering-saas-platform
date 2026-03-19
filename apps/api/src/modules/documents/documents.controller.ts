import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateDocumentDto } from './dto/document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents for the current organisation' })
  @ApiQuery({ name: 'projectId', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
    @Query('projectId') projectId?: string,
  ) {
    this.requireOrgContext(user);
    return this.documentsService.findAll(user.organisationId!, pagination, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.documentsService.findById(id, user.organisationId!);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    if (!file) {
      throw new ForbiddenException('File is required');
    }
    return this.documentsService.create(user.organisationId!, user.id, dto, file);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document file (not yet implemented)' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    this.requireOrgContext(user);
    await this.documentsService.findById(id, user.organisationId!);
    res.status(HttpStatus.NOT_IMPLEMENTED).json({
      statusCode: HttpStatus.NOT_IMPLEMENTED,
      message:
        'File storage backend is not yet implemented. Document metadata is available via GET /documents/:id.',
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.documentsService.delete(id, user.organisationId!);
  }

  private requireOrgContext(
    user: RequestUser,
  ): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }
  }
}
