import { Module } from '@nestjs/common';
import { LoadCasesController } from './load-cases.controller';
import { LoadCasesService } from './load-cases.service';

@Module({
  controllers: [LoadCasesController],
  providers: [LoadCasesService],
  exports: [LoadCasesService],
})
export class LoadCasesModule {}
