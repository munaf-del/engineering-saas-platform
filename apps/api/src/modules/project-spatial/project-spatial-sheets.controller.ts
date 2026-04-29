import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateProjectSpatialSheetDto,
  UpdateProjectSpatialSheetDto,
} from './dto/project-spatial.dto';
import { ProjectSpatialService } from './project-spatial.service';

@ApiTags('project-spatial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/spatial/sheets')
export class ProjectSpatialSheetsController {
  constructor(private readonly projectSpatialService: ProjectSpatialService) {}

  @Get()
  @ApiOperation({ summary: 'List Project Spatial Sheets' })
  async listSheets(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.listSheets(this.access(projectId, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Create a Project Spatial Sheet' })
  async createSheet(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectSpatialSheetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.createSheet(this.access(projectId, user), dto);
  }

  @Patch(':sheetId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Update a Project Spatial Sheet' })
  async updateSheet(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sheetId', ParseUUIDPipe) sheetId: string,
    @Body() dto: UpdateProjectSpatialSheetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.updateSheet(this.access(projectId, user), sheetId, dto);
  }

  @Delete(':sheetId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'engineer')
  @ApiOperation({ summary: 'Delete a Project Spatial Sheet' })
  async deleteSheet(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sheetId', ParseUUIDPipe) sheetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectSpatialService.deleteSheet(this.access(projectId, user), sheetId);
  }

  private access(projectId: string, user: RequestUser) {
    if (!user.organisationId) {
      throw new Error('Authenticated user has no organisation');
    }

    return {
      organisationId: user.organisationId,
      orgRole: user.orgRole,
      projectId,
      userId: user.id,
    };
  }
}
