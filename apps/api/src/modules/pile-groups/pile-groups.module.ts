import { Module } from '@nestjs/common';
import { CalculationsModule } from '../calculations/calculations.module';
import { PileGroupsController } from './pile-groups.controller';
import { PileGroupsService } from './pile-groups.service';
import { MultiPileService } from './multi-pile.service';

@Module({
  imports: [CalculationsModule],
  controllers: [PileGroupsController],
  providers: [PileGroupsService, MultiPileService],
  exports: [PileGroupsService, MultiPileService],
})
export class PileGroupsModule {}
