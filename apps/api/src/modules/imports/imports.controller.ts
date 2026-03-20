import {
  Body,
  Controller,
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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportsService } from './imports.service';
import { ImportTemplatesService } from './import-templates.service';
import { RulePackIngestionService } from './rule-pack-ingestion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateImportJobDto } from './dto/import.dto';

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly templatesService: ImportTemplatesService,
    private readonly rulePackIngestion: RulePackIngestionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List import jobs for the current organisation' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    this.requireOrgContext(user);
    return this.importsService.findAll(user.organisationId!, pagination);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available import templates' })
  async listTemplates() {
    return this.templatesService.getAvailableTemplates();
  }

  @Get('templates/:entityType')
  @ApiOperation({ summary: 'Download import template CSV' })
  async downloadTemplate(
    @Param('entityType') entityType: string,
    @Res() res: Response,
  ) {
    const template = this.templatesService.getTemplate(entityType);
    if (!template) {
      res.status(404).json({ message: `No template for entity type: ${entityType}` });
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${template.info.fileName}"`,
    );
    res.send(template.content);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import job detail (includes errors and diff)' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.importsService.findById(id);
  }

  @Get(':id/errors')
  @ApiOperation({ summary: 'List validation errors for an import job' })
  async getErrors(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.importsService.getErrors(id, pagination);
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload and validate an import file (supports CSV, XLSX, JSON)',
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportJobDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    if (!file) {
      throw new ForbiddenException('File is required');
    }

    return this.importsService.uploadAndValidate(
      user.organisationId!,
      user.id,
      dto,
      { buffer: file.buffer, originalname: file.originalname },
    );
  }

  @Post(':id/apply')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Apply a validated import (creates versioned snapshot)' })
  async apply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.importsService.apply(id, user.id);
  }

  @Post(':id/rollback')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Rollback an applied import (deletes the snapshot)' })
  async rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.importsService.rollback(id, user.id);
  }

  @Post(':id/submit-for-approval')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Submit a validated import for admin approval' })
  async submitForApproval(@Param('id', ParseUUIDPipe) id: string) {
    return this.importsService.submitForApproval(id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Approve an import awaiting review' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { reason?: string },
  ) {
    return this.importsService.approve(id, user.id, body?.reason);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Reject an import awaiting review' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { reason?: string },
  ) {
    return this.importsService.reject(id, user.id, body?.reason);
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Activate an approved import (applies and activates data)' })
  async activateImport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.importsService.activate(id, user.id);
  }

  @Get(':id/approvals')
  @ApiOperation({ summary: 'Get approval history for an import job' })
  async getApprovals(@Param('id', ParseUUIDPipe) id: string) {
    return this.importsService.getApprovals(id);
  }

  @Get('rule-packs/active')
  @ApiOperation({ summary: 'Get all currently active rule packs' })
  async getActiveRulePacks() {
    return this.rulePackIngestion.getActiveRulePacks();
  }

  @Post('rule-packs/:rulePackId/activate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Activate an approved rule pack for use in calculations' })
  async activateRulePack(
    @Param('rulePackId', ParseUUIDPipe) rulePackId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { note?: string },
  ) {
    await this.rulePackIngestion.activate(rulePackId, user.id, undefined, body?.note);
    return { message: 'Rule pack activated', rulePackId };
  }

  @Post('rule-packs/:rulePackId/deactivate')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Deactivate a rule pack' })
  async deactivateRulePack(
    @Param('rulePackId', ParseUUIDPipe) rulePackId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.rulePackIngestion.deactivate(rulePackId, user.id);
    return { message: 'Rule pack deactivated', rulePackId };
  }

  private requireOrgContext(
    user: RequestUser,
  ): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException('Organisation context required');
    }
  }
}
