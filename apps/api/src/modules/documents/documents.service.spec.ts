import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const access = {
    organisationId: '22222222-2222-2222-2222-222222222222',
    userId: '33333333-3333-3333-3333-333333333333',
    orgRole: 'engineer',
  };

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
});
