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
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { AddOrgMemberDto } from './dto/add-org-member.dto';
import { UpdateOrgMemberRoleDto } from './dto/update-org-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  RequestUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organisations the current user belongs to' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.organisationsService.findByUser(user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organisation by ID (must be a member)' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organisation (caller becomes owner)' })
  async create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organisation (owner/admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organisation (owner only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.remove(id, user.id);
  }

  // ── Member Management ──────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List organisation members (requires membership)' })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.listMembers(id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the organisation (owner/admin only)' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrgMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.addMember(id, user.id, dto.userId, dto.role);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update a member role (owner/admin only)' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateOrgMemberRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.updateMemberRole(id, user.id, targetUserId, dto.role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the organisation (owner/admin only)' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.organisationsService.removeMember(id, user.id, targetUserId);
  }
}
