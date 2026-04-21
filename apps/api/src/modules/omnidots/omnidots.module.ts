import { Module } from '@nestjs/common';
import { CalculationsModule } from '../calculations/calculations.module';
import { OmnidotsClient } from './omnidots.client';
import { OmnidotsController } from './omnidots.controller';
import { OmnidotsCredentialsService } from './omnidots.credentials';
import { OmnidotsService } from './omnidots.service';

@Module({
  imports: [CalculationsModule],
  controllers: [OmnidotsController],
  providers: [OmnidotsClient, OmnidotsCredentialsService, OmnidotsService],
  exports: [OmnidotsClient, OmnidotsService],
})
export class OmnidotsModule {}
