import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByRun(calculationRunId: string, projectId: string) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { id: calculationRunId, projectId },
    });
    if (!run) {
      throw new NotFoundException('Calculation run not found');
    }

    return this.prisma.calculationReport.findMany({
      where: { calculationRunId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, projectId: string) {
    const report = await this.prisma.calculationReport.findFirst({
      where: { id, projectId },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async create(
    calculationRunId: string,
    projectId: string,
    userId: string,
    dto: CreateReportDto,
  ) {
    const run = await this.prisma.calculationRun.findFirst({
      where: { id: calculationRunId, projectId },
      include: {
        snapshot: true,
        designChecks: true,
      },
    });
    if (!run) {
      throw new NotFoundException('Calculation run not found');
    }

    const evidenceBundle = this.buildEvidenceBundle(run);

    return this.prisma.calculationReport.create({
      data: {
        calculationRunId,
        projectId,
        title: dto.title,
        format: dto.format ?? 'json',
        status: 'completed',
        evidenceBundle,
        generatedBy: userId,
        generatedAt: new Date(),
      },
    });
  }

  private buildEvidenceBundle(run: any) {
    const request = run.requestSnapshot as Record<string, unknown> | null;
    const result = run.resultSnapshot as Record<string, unknown> | null;
    const snapshot = run.snapshot;
    const designChecks = run.designChecks ?? [];

    return {
      calcType: run.calcType,
      runId: run.id,
      snapshotHash: snapshot?.combinedHash ?? run.requestHash,
      request: request ?? {},
      result: result ?? {},
      snapshotHashes: snapshot
        ? {
            inputHash: snapshot.inputHash,
            standardsHash: snapshot.standardsHash,
            rulePackHash: snapshot.rulePackHash,
            outputHash: snapshot.outputHash,
            combinedHash: snapshot.combinedHash,
          }
        : null,
      designChecks: designChecks.map((dc: any) => ({
        checkType: dc.checkType,
        limitState: dc.limitState,
        demandValue: dc.demandValue,
        capacityValue: dc.capacityValue,
        utilisationRatio: dc.utilisationRatio,
        status: dc.status,
        clauseRef: dc.clauseRef,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
