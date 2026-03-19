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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects in current organisation' })
  async findAll(@CurrentUser() user: RequestUser) {
    this.requireOrgContext(user);
    return this.projectsService.findAll(user.organisationId!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.findById(id, user.organisationId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.create(user.organisationId!, user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.update(id, user.organisationId!, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.remove(id, user.organisationId!);
  }

  // ── Membership ──────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List project members' })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.listMembers(id, user.organisationId!);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the project' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.addMember(id, user.organisationId!, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the project' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.requireOrgContext(user);
    return this.projectsService.removeMember(id, user.organisationId!, userId);
  }

  private requireOrgContext(user: RequestUser): asserts user is RequestUser & { organisationId: string } {
    if (!user.organisationId) {
      throw new ForbiddenException(
        'Organisation context required. Login with an organisationId or select one.',
      );
    }
  }
}
