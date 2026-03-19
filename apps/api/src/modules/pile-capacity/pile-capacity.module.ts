import { Module } from '@nestjs/common';
import { PileCapacityController } from './pile-capacity.controller';
import { PileCapacityService } from './pile-capacity.service';

@Module({
  controllers: [PileCapacityController],
  providers: [PileCapacityService],
  exports: [PileCapacityService],
})
export class PileCapacityModule {}
