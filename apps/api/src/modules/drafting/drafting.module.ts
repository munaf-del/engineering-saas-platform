import { Module } from '@nestjs/common';
import { DraftingController } from './drafting.controller';
import { DraftingService } from './drafting.service';

@Module({
  controllers: [DraftingController],
  providers: [DraftingService],
  exports: [DraftingService],
})
export class DraftingModule {}
