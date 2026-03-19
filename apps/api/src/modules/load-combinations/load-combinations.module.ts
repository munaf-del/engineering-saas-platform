import { Module } from '@nestjs/common';
import { LoadCombinationsController } from './load-combinations.controller';
import { LoadCombinationsService } from './load-combinations.service';

@Module({
  controllers: [LoadCombinationsController],
  providers: [LoadCombinationsService],
  exports: [LoadCombinationsService],
})
export class LoadCombinationsModule {}
