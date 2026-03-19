export interface Document {
  id: string;
  organisationId: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
}
