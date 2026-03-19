import { Module } from '@nestjs/common';
import { PileGroupsController } from './pile-groups.controller';
import { PileGroupsService } from './pile-groups.service';

@Module({
  controllers: [PileGroupsController],
  providers: [PileGroupsService],
  exports: [PileGroupsService],
})
export class PileGroupsModule {}
