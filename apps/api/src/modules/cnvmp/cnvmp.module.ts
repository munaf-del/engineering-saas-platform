import { Module } from '@nestjs/common';
import { ProjectCnvmpController } from './cnvmp.controller';
import { ProjectCnvmpService } from './cnvmp.service';

@Module({
  controllers: [ProjectCnvmpController],
  providers: [ProjectCnvmpService],
})
export class ProjectCnvmpModule {}
