import { Module } from '@nestjs/common';
import { GeotechController } from './geotech.controller';
import { GeotechService } from './geotech.service';

@Module({
  controllers: [GeotechController],
  providers: [GeotechService],
  exports: [GeotechService],
})
export class GeotechModule {}
