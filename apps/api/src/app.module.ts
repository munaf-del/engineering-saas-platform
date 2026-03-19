import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StandardsModule } from './modules/standards/standards.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { GeotechModule } from './modules/geotech/geotech.module';
import { SteelSectionsModule } from './modules/steel-sections/steel-sections.module';
import { RebarModule } from './modules/rebar/rebar.module';
import { ImportsModule } from './modules/imports/imports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { LoadCasesModule } from './modules/load-cases/load-cases.module';
import { LoadCombinationsModule } from './modules/load-combinations/load-combinations.module';
import { CalculatorsModule } from './modules/calculators/calculators.module';
import { CalculationsModule } from './modules/calculations/calculations.module';
import { PileGroupsModule } from './modules/pile-groups/pile-groups.module';
import { PileCapacityModule } from './modules/pile-capacity/pile-capacity.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganisationsModule,
    ProjectsModule,
    StandardsModule,
    MaterialsModule,
    GeotechModule,
    SteelSectionsModule,
    RebarModule,
    ImportsModule,
    DocumentsModule,
    LoadCasesModule,
    LoadCombinationsModule,
    CalculatorsModule,
    CalculationsModule,
    PileGroupsModule,
    PileCapacityModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
