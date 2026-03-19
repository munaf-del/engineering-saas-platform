import { Module } from '@nestjs/common';
import { SteelSectionsController } from './steel-sections.controller';
import { SteelSectionsService } from './steel-sections.service';

@Module({
  controllers: [SteelSectionsController],
  providers: [SteelSectionsService],
  exports: [SteelSectionsService],
})
export class SteelSectionsModule {}
