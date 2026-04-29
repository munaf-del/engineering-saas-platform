import { Test, TestingModule } from '@nestjs/testing';
import { ProjectEnvironmentalMonitoringController } from './environmental-monitoring.controller';
import { ProjectEnvironmentalMonitoringService } from './environmental-monitoring.service';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

jest.mock('@eng/shared', () => ({
  PROJECT_SPATIAL_FEATURE_TYPES: [],
}));

jest.mock('./environmental-monitoring.service', () => ({
  ProjectEnvironmentalMonitoringService: class ProjectEnvironmentalMonitoringService {},
}));

describe('ProjectEnvironmentalMonitoringController Omnidots routes', () => {
  let controller: ProjectEnvironmentalMonitoringController;
  let service: {
    listOmnidotsConnections: jest.Mock;
    createOmnidotsConnection: jest.Mock;
    updateOmnidotsConnection: jest.Mock;
    validateOmnidotsConnection: jest.Mock;
    syncOmnidotsMeasuringPoints: jest.Mock;
    listOmnidotsMeasuringPoints: jest.Mock;
    importOmnidotsData: jest.Mock;
    buildOmnidotsDataset: jest.Mock;
    createVibrationResultsFromOmnidotsDataset: jest.Mock;
  };

  const user: RequestUser = {
    id: 'user-1',
    email: 'user@example.com',
    organisationId: 'org-1',
    orgRole: 'admin',
  };

  beforeEach(async () => {
    service = {
      listOmnidotsConnections: jest.fn(),
      createOmnidotsConnection: jest.fn(),
      updateOmnidotsConnection: jest.fn(),
      validateOmnidotsConnection: jest.fn(),
      syncOmnidotsMeasuringPoints: jest.fn(),
      listOmnidotsMeasuringPoints: jest.fn(),
      importOmnidotsData: jest.fn(),
      buildOmnidotsDataset: jest.fn(),
      createVibrationResultsFromOmnidotsDataset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectEnvironmentalMonitoringController],
      providers: [
        {
          provide: ProjectEnvironmentalMonitoringService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProjectEnvironmentalMonitoringController>(
      ProjectEnvironmentalMonitoringController,
    );
  });

  it('delegates report-scoped Omnidots actions to the monitoring service with project access context', async () => {
    await controller.listOmnidotsConnections('project-1', 'report-1', user);
    await controller.createOmnidotsConnection(
      'project-1',
      'report-1',
      { displayName: 'Omnidots Honeycomb', token: 'secret-token' },
      user,
    );
    await controller.updateOmnidotsConnection(
      'project-1',
      'report-1',
      'connection-1',
      { token: 'replacement-token' },
      user,
    );
    await controller.validateOmnidotsConnection('project-1', 'report-1', 'connection-1', user);
    await controller.syncOmnidotsMeasuringPoints('project-1', 'report-1', 'connection-1', user);
    await controller.listOmnidotsMeasuringPoints('project-1', 'report-1', 'connection-1', user);
    await controller.importOmnidotsData(
      'project-1',
      'report-1',
      {
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        dateFrom: '2026-04-21T00:00:00.000Z',
        dateTo: '2026-04-22T00:00:00.000Z',
        selectedMetricKeys: ['vtop', 'vdv'],
      },
      user,
    );
    await controller.buildOmnidotsDataset(
      'project-1',
      'report-1',
      {
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        dateFrom: '2026-04-21T00:00:00.000Z',
        dateTo: '2026-04-22T00:00:00.000Z',
        selectedMetricKeys: ['vtop'],
      },
      user,
    );
    await controller.createVibrationResultsFromOmnidotsDataset(
      'project-1',
      'report-1',
      { datasetId: 'dataset-1' },
      user,
    );

    const expectedAccess = {
      organisationId: 'org-1',
      orgRole: 'admin',
      projectId: 'project-1',
      userId: 'user-1',
    };

    expect(service.listOmnidotsConnections).toHaveBeenCalledWith(expectedAccess, 'report-1');
    expect(service.createOmnidotsConnection).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      expect.objectContaining({
        displayName: 'Omnidots Honeycomb',
        token: 'secret-token',
      }),
    );
    expect(service.updateOmnidotsConnection).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      'connection-1',
      expect.objectContaining({
        token: 'replacement-token',
      }),
    );
    expect(service.validateOmnidotsConnection).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      'connection-1',
    );
    expect(service.syncOmnidotsMeasuringPoints).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      'connection-1',
    );
    expect(service.listOmnidotsMeasuringPoints).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      'connection-1',
    );
    expect(service.importOmnidotsData).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      expect.objectContaining({
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        selectedMetricKeys: ['vtop', 'vdv'],
      }),
    );
    expect(service.buildOmnidotsDataset).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      expect.objectContaining({
        connectionId: 'connection-1',
        measuringPointId: 'point-1',
        selectedMetricKeys: ['vtop'],
      }),
    );
    expect(service.createVibrationResultsFromOmnidotsDataset).toHaveBeenCalledWith(
      expectedAccess,
      'report-1',
      { datasetId: 'dataset-1' },
    );
  });
});
