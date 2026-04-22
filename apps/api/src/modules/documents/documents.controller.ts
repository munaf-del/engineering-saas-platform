import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
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
import { createReadStream } from 'node:fs';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
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
  @ApiQuery({ name: 'mimeType', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
    @Query('projectId') projectId?: string,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.documentsService.findAll(
      this.documentsService.accessFor(user),
      pagination,
      projectId,
      mimeType,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.findById(id, this.documentsService.accessFor(user));
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
    if (!file) {
      throw new ForbiddenException('File is required');
    }
    return this.documentsService.create(this.documentsService.accessFor(user), dto, file);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document file' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { document, absolutePath } = await this.documentsService.prepareDownload(
      id,
      this.documentsService.accessFor(user),
    );

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', String(document.sizeBytes));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/["\\]/g, '_')}"`,
    );

    createReadStream(absolutePath).pipe(res);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.delete(id, this.documentsService.accessFor(user));
  }
}
