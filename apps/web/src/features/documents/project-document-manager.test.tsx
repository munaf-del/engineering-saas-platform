/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Document } from '@eng/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProjectDocumentManager,
  parseProtectedDocumentDeleteWarning,
} from './project-document-manager';
import { ApiError } from '@/lib/api-client';

const mockRefetch = vi.fn();
const mockUploadMutateAsync = vi.fn();
const mockDownloadMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
let mockDocuments: Document[] = [];

vi.mock('@/hooks/use-documents', () => ({
  useProjectDocuments: (projectId: string) => ({
    data: mockDocuments.filter((document) => document.projectId === projectId),
    isLoading: false,
    refetch: mockRefetch,
  }),
  useUploadProjectDocument: () => ({
    isPending: false,
    mutateAsync: mockUploadMutateAsync,
  }),
  useDownloadProjectDocument: () => ({
    isPending: false,
    mutateAsync: mockDownloadMutateAsync,
  }),
  useDeleteProjectDocument: () => ({
    isPending: false,
    mutateAsync: mockDeleteMutateAsync,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ProjectDocumentManager', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockDocuments = [
      buildDocument({
        id: 'document-pdf',
        fileName: 'transmittal-evidence.pdf',
        mimeType: 'application/pdf',
        name: 'Transmittal evidence',
        storagePath: '/private/storage/transmittal-evidence.pdf',
      }),
      buildDocument({
        id: 'document-text',
        fileName: 'site-notes.txt',
        mimeType: 'text/plain',
        name: 'Site notes',
        sizeBytes: 18,
        storagePath: '/private/storage/site-notes.txt',
      }),
      buildDocument({
        id: 'other-project-document',
        projectId: 'project-2',
        fileName: 'other-project.txt',
        mimeType: 'text/plain',
      }),
    ];
    mockUploadMutateAsync.mockReset();
    mockDownloadMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
    mockRefetch.mockReset();
    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:document-1'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('renders project-scoped rows with generic non-PDF documents and download actions', async () => {
    await renderManager();

    expect(container.textContent).toContain('transmittal-evidence.pdf');
    expect(container.textContent).toContain('site-notes.txt');
    expect(container.textContent).toContain('text/plain');
    expect(container.textContent).not.toContain('other-project.txt');
    expect(container.querySelector('[aria-label="Open site-notes.txt"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Download site-notes.txt"]')).toBeTruthy();
  });

  it('uploads a generic text document through the upload action', async () => {
    mockUploadMutateAsync.mockResolvedValue(buildDocument({ mimeType: 'text/plain' }));
    await renderManager();

    const input = container.querySelector<HTMLInputElement>('#project-document-upload');
    const nameInput = container.querySelector<HTMLInputElement>('#project-document-name');
    const file = new File(['hello'], 'general-notes.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      if (nameInput) {
        setInputValue(nameInput, 'General notes');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockUploadMutateAsync).toHaveBeenCalledWith({
      file,
      name: 'General notes',
    });
  });

  it('removes an unreferenced deleted document after the list updates', async () => {
    mockDeleteMutateAsync.mockImplementation(async (documentId: string) => {
      mockDocuments = mockDocuments.filter((document) => document.id !== documentId);
      return buildDocument({ id: documentId });
    });
    await renderManager();

    await clickButton('Delete site-notes.txt');
    await clickButton('Delete');
    await renderManager();

    expect(container.textContent).not.toContain('site-notes.txt');
    expect(container.textContent).toContain('transmittal-evidence.pdf');
  });

  it('shows protected reference metadata from a 409 without sensitive fields', async () => {
    mockDeleteMutateAsync.mockRejectedValue(
      new ApiError(409, 'Conflict', {
        documentId: 'document-pdf',
        projectId: 'project-1',
        referencesCount: 1,
        references: [
          {
            documentId: 'document-pdf',
            projectId: 'project-1',
            drawingId: 'drawing-1',
            drawingName: 'GA Drawing',
            transmittalId: 'transmittal-1',
            transmittalNumber: 'TRN-001',
            transmittalStatus: 'issued',
            referenceType: 'current_evidence',
            storagePath: '/private/storage/transmittal-evidence.pdf',
            token: 'secret-token',
            password: 'password-value',
            session: 'session-value',
            rawBytes: '010101',
          },
        ],
      }),
    );
    await renderManager();

    await clickButton('Delete transmittal-evidence.pdf');
    await clickButton('Delete');

    expect(document.body.textContent).toContain('Document deletion blocked');
    expect(document.body.textContent).toContain('GA Drawing');
    expect(document.body.textContent).toContain('TRN-001');
    expect(document.body.textContent).toContain('current evidence');
    expect(document.body.textContent).not.toContain('/private/storage');
    expect(document.body.textContent).not.toContain('secret-token');
    expect(document.body.textContent).not.toContain('password-value');
    expect(document.body.textContent).not.toContain('session-value');
    expect(document.body.textContent).not.toContain('010101');
  });

  it('filters rows inside the current project scope', async () => {
    await renderManager();

    const search = container.querySelector<HTMLInputElement>('[aria-label="Search documents"]');
    await act(async () => {
      if (search) {
        setInputValue(search, 'pdf');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(container.textContent).toContain('transmittal-evidence.pdf');
    expect(container.textContent).not.toContain('site-notes.txt');
    expect(container.textContent).not.toContain('other-project.txt');
  });

  it('parses Nest conflict bodies when protected metadata is nested under message', () => {
    const warning = parseProtectedDocumentDeleteWarning(
      new ApiError(409, 'Conflict', {
        message: {
          documentId: 'document-pdf',
          projectId: 'project-1',
          referencesCount: 1,
          references: [
            {
              drawingId: 'drawing-1',
              drawingName: 'GA Drawing',
              referenceType: 'evidence_event',
            },
          ],
        },
      }),
    );

    expect(warning).toEqual({
      documentId: 'document-pdf',
      projectId: 'project-1',
      referencesCount: 1,
      references: [
        {
          drawingId: 'drawing-1',
          drawingName: 'GA Drawing',
          referenceType: 'evidence_event',
          transmittalId: undefined,
          transmittalNumber: undefined,
          transmittalStatus: undefined,
        },
      ],
    });
  });

  async function renderManager() {
    await act(async () => {
      root.render(<ProjectDocumentManager projectCode="NSW-001" projectId="project-1" />);
    });
  }

  async function clickButton(label: string) {
    const button = Array.from(document.body.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label,
    );
    expect(button).toBeTruthy();
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }
});

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
}

function buildDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'document-1',
    organisationId: 'org-1',
    projectId: 'project-1',
    name: 'Document',
    fileName: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: '/private/storage/document.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  };
}
