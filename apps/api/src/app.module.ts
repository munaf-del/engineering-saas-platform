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
