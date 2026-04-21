import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateOmnidotsProviderConnectionDto,
  UpdateOmnidotsProviderConnectionDto,
} from './dto/omnidots-connection.dto';
import { OmnidotsService } from './omnidots.service';

@ApiTags('omnidots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organisations/:id/omnidots-connections')
export class OmnidotsController {
  constructor(private readonly omnidotsService: OmnidotsService) {}

  @Get()
  @ApiOperation({ summary: 'List Omnidots provider connections for an organisation' })
  async listConnections(
    @Param('id', ParseUUIDPipe) organisationId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.omnidotsService.listConnections(organisationId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an Omnidots provider connection for an organisation' })
  async createConnection(
    @Param('id', ParseUUIDPipe) organisationId: string,
    @Body() dto: CreateOmnidotsProviderConnectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.omnidotsService.createConnection(organisationId, user.id, dto);
  }

  @Patch(':connectionId')
  @ApiOperation({ summary: 'Update an Omnidots provider connection for an organisation' })
  async updateConnection(
    @Param('id', ParseUUIDPipe) organisationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Body() dto: UpdateOmnidotsProviderConnectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.omnidotsService.updateConnection(organisationId, connectionId, user.id, dto);
  }

  @Post(':connectionId/validate')
  @ApiOperation({ summary: 'Validate the stored Omnidots token for a connection' })
  async validateConnection(
    @Param('id', ParseUUIDPipe) organisationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.omnidotsService.validateStoredConnection(organisationId, connectionId, user.id);
  }

  @Post(':connectionId/sync-measuring-points')
  @ApiOperation({ summary: 'Sync Omnidots measuring points for a stored connection' })
  async syncMeasuringPoints(
    @Param('id', ParseUUIDPipe) organisationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.omnidotsService.syncMeasuringPoints(organisationId, connectionId, user.id);
  }
}
