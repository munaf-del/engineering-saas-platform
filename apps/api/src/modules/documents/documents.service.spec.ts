import { DocumentsService } from './documents.service';

const testAccess = {
  organisationId: '22222222-2222-2222-2222-222222222222',
  userId: '33333333-3333-3333-3333-333333333333',
  orgRole: 'engineer',
};

describe('DocumentsService', () => {
  const access = testAccess;

  it('keeps generic project document upload general-purpose for non-PDF files', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: '11111111-1111-1111-1111-111111111111',
          organisationId: access.organisationId,
          members: [{ userId: access.userId, role: 'lead' }],
        }),
      },
      document: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    const storageService = {
      deleteStoredFile: jest.fn(),
      persistUploadedFile: jest.fn().mockResolvedValue({
        storagePath: 'project-documents/document-1/survey.csv',
      }),
    };
    const service = new DocumentsService(prisma as never, storageService as never);

    const document = await service.create(
      access,
      {
        name: 'Survey CSV',
        projectId: '11111111-1111-1111-1111-111111111111',
      },
      {
        originalname: 'survey.csv',
        mimetype: 'text/csv',
        size: 12,
        buffer: Buffer.from('a,b\n1,2\n'),
      },
    );

    expect(document).toMatchObject({
      fileName: 'survey.csv',
      mimeType: 'text/csv',
      projectId: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('blocks deleting a document referenced by current drafting transmittal evidence', async () => {
    const prisma = buildDeletePrisma({
      draftingModels: [
        draftingDrawingModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.pdf',
          artifactMimeType: 'application/pdf',
          artifactStatus: 'attached',
        }),
      ],
    });
    const storageService = buildStorageService();
    const service = new DocumentsService(prisma as never, storageService as never);

    await expect(service.delete('document-1', access)).rejects.toMatchObject({
      response: expect.objectContaining({
        documentId: 'document-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        referencesCount: 1,
        references: [
          expect.objectContaining({
            drawingId: 'drawing-1',
            drawingName: 'Drawing 1',
            referenceType: 'current_evidence',
            transmittalId: 'transmittal-1',
            transmittalNumber: 'TRN-001',
            transmittalStatus: 'issued',
          }),
        ],
      }),
    });
    expect(prisma.document.delete).not.toHaveBeenCalled();
    expect(storageService.deleteStoredFile).not.toHaveBeenCalled();
  });

  it('blocks deleting a document referenced by drafting transmittal evidence event history', async () => {
    const prisma = buildDeletePrisma({
      draftingModels: [
        draftingDrawingModel({
          artifactDocumentId: 'document-2',
          evidenceEvents: [
            {
              id: 'event-1',
              action: 'replaced',
              at: '2026-04-24T01:00:00.000Z',
              by: access.userId,
              artifactDocumentId: 'document-1',
              artifactFileName: 'old-evidence.pdf',
              artifactSource: 'manual_upload',
            },
          ],
        }),
      ],
    });
    const storageService = buildStorageService();
    const service = new DocumentsService(prisma as never, storageService as never);

    await expect(service.delete('document-1', access)).rejects.toMatchObject({
      response: expect.objectContaining({
        referencesCount: 1,
        references: [
          expect.objectContaining({
            referenceType: 'evidence_event',
            transmittalId: 'transmittal-1',
            transmittalNumber: 'TRN-001',
          }),
        ],
      }),
    });
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it('blocks deleting a document referenced by a drafting revision snapshot', async () => {
    const prisma = buildDeletePrisma({
      draftingModels: [draftingDrawingModel({ artifactDocumentId: 'document-2' })],
      revisionModels: [
        draftingDrawingModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'issued-evidence.pdf',
          artifactMimeType: 'application/pdf',
          artifactStatus: 'attached',
        }),
      ],
    });
    const service = new DocumentsService(prisma as never, buildStorageService() as never);

    await expect(service.delete('document-1', access)).rejects.toMatchObject({
      response: expect.objectContaining({
        referencesCount: 1,
        references: [
          expect.objectContaining({
            drawingId: 'drawing-1',
            referenceType: 'current_evidence',
            transmittalNumber: 'TRN-001',
          }),
        ],
      }),
    });
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it('deletes unreferenced project documents normally', async () => {
    const prisma = buildDeletePrisma({
      draftingModels: [draftingDrawingModel({ artifactDocumentId: 'other-document' })],
    });
    const storageService = buildStorageService();
    const service = new DocumentsService(prisma as never, storageService as never);

    const deleted = await service.delete('document-1', access);

    expect(deleted).toMatchObject({ id: 'document-1' });
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'document-1' } });
    expect(storageService.deleteStoredFile).toHaveBeenCalledWith('project/document-1/survey.csv');
  });

  it('keeps unreferenced generic non-PDF project documents deletable', async () => {
    const prisma = buildDeletePrisma({
      document: buildStoredDocument({ fileName: 'survey.csv', mimeType: 'text/csv' }),
      draftingModels: [],
    });
    const storageService = buildStorageService();
    const service = new DocumentsService(prisma as never, storageService as never);

    await expect(service.delete('document-1', access)).resolves.toMatchObject({
      fileName: 'survey.csv',
      mimeType: 'text/csv',
    });
    expect(storageService.deleteStoredFile).toHaveBeenCalledWith('project/document-1/survey.csv');
  });

  it('returns drafting evidence reference metadata without file bytes or secrets', async () => {
    const prisma = buildDeletePrisma({
      draftingModels: [
        draftingDrawingModel({
          artifactDocumentId: 'document-1',
          artifactFileName: 'evidence.pdf',
          artifactMimeType: 'application/pdf',
          artifactStatus: 'attached',
        }),
      ],
    });
    const service = new DocumentsService(prisma as never, buildStorageService() as never);

    const references = await service.findDraftingTransmittalEvidenceReferences(
      '11111111-1111-1111-1111-111111111111',
      'document-1',
    );

    expect(references).toEqual([
      expect.objectContaining({
        documentId: 'document-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        drawingId: 'drawing-1',
        drawingName: 'Drawing 1',
        referenceType: 'current_evidence',
      }),
    ]);
    expect(JSON.stringify(references)).not.toMatch(/%PDF|storagePath|token|secret|session/i);
  });
});

function buildDeletePrisma({
  document = buildStoredDocument(),
  draftingModels,
  revisionModels = [],
}: {
  document?: ReturnType<typeof buildStoredDocument>;
  draftingModels: Record<string, unknown>[];
  revisionModels?: Record<string, unknown>[];
}) {
  return {
    project: {
      findFirst: jest.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        organisationId: testAccess.organisationId,
        members: [{ userId: testAccess.userId, role: 'lead' }],
      }),
    },
    document: {
      delete: jest.fn().mockResolvedValue(document),
      findFirst: jest.fn().mockResolvedValue(document),
    },
    draftingDrawing: {
      findMany: jest.fn().mockResolvedValue(
        draftingModels.map((modelJson, index) => ({
          id: `drawing-${index + 1}`,
          modelJson,
          projectId: '11111111-1111-1111-1111-111111111111',
          revisions: revisionModels.map((modelJsonSnapshot) => ({ modelJsonSnapshot })),
          title: `Drawing ${index + 1}`,
        })),
      ),
    },
  };
}

function buildStorageService() {
  return {
    deleteStoredFile: jest.fn(),
    persistUploadedFile: jest.fn(),
  };
}

function buildStoredDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'document-1',
    organisationId: testAccess.organisationId,
    projectId: '11111111-1111-1111-1111-111111111111',
    entityType: undefined,
    entityId: undefined,
    name: 'Survey CSV',
    fileName: 'survey.csv',
    mimeType: 'text/csv',
    sizeBytes: 12,
    storagePath: 'project/document-1/survey.csv',
    uploadedBy: testAccess.userId,
    createdAt: new Date('2026-04-24T00:00:00.000Z'),
    ...overrides,
  };
}

function draftingDrawingModel(transmittalOverrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    units: 'mm',
    drawingId: 'drawing-1',
    view: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    layers: [],
    underlays: [],
    objects: [],
    titleBlock: {},
    revisionBlock: {
      revisions: [],
    },
    scheduleSheets: [],
    schedulePackIssues: [],
    drawingSheets: [],
    drawingSheetIssues: [],
    drawingTransmittals: [
      {
        id: 'transmittal-1',
        transmittalNumber: 'TRN-001',
        title: 'Drawing issue package',
        purpose: 'For information',
        status: 'issued',
        issueDate: '2026-04-24T00:00:00.000Z',
        issuedBy: 'Avery Drafter',
        issuedTo: ['client@example.com'],
        cc: [],
        includedDrawingSheetIssueIds: ['issue-1'],
        includedSheets: [
          {
            drawingSheetIssueId: 'issue-1',
            sheetId: 'sheet-1',
            sheetNumber: 'S-101',
            sheetName: 'Geometry Sheet',
            revision: 'B',
            status: 'issued',
            issueNumber: 'ISS-001',
            snapshotLabel: 'ISS-001 Rev B - S-101 Geometry Sheet',
          },
        ],
        evidenceEvents: [],
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
        ...transmittalOverrides,
      },
    ],
  };
}
