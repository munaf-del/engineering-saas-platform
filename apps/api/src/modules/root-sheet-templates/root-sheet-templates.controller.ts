import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateRootSheetTemplateDto,
  ListRootSheetTemplatesDto,
  UpdateRootSheetTemplateDto,
} from './dto/root-sheet-templates.dto';
import { RootSheetTemplatesService } from './root-sheet-templates.service';

@ApiTags('root-sheet-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('root-sheet-templates')
export class RootSheetTemplatesController {
  constructor(private readonly rootSheetTemplatesService: RootSheetTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List Root Sheet Templates for the current organisation scope' })
  async listTemplates(
    @Query() query: ListRootSheetTemplatesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rootSheetTemplatesService.listTemplates(this.access(user), query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a Root Sheet Template' })
  async createTemplate(
    @Body() dto: CreateRootSheetTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rootSheetTemplatesService.createTemplate(this.access(user), dto);
  }

  @Patch(':templateId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a Root Sheet Template and optionally publish a new version' })
  async updateTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateRootSheetTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rootSheetTemplatesService.updateTemplate(this.access(user), templateId, dto);
  }

  @Delete(':templateId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Archive a Root Sheet Template' })
  async archiveTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rootSheetTemplatesService.archiveTemplate(this.access(user), templateId);
  }

  private access(user: RequestUser) {
    if (!user.organisationId) {
      throw new Error('Authenticated user has no organisation');
    }

    return {
      organisationId: user.organisationId,
      orgRole: user.orgRole,
      userId: user.id,
    };
  }
}

