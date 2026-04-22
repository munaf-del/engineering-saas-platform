import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

type PersistDocumentFileParams = {
  organisationId: string;
  projectId?: string;
  documentId: string;
  originalName: string;
  buffer: Buffer;
};

@Injectable()
export class DocumentStorageService {
  constructor(private readonly configService: ConfigService) {}

  async persistUploadedFile(params: PersistDocumentFileParams) {
    const storageRoot = this.getStorageRoot();
    const safeFilename = sanitizeFilename(params.originalName);
    const relativePath = toPosixPath(
      path.join(
        params.organisationId,
        params.projectId ?? 'unscoped',
        `${params.documentId}-${safeFilename}`,
      ),
    );
    const absolutePath = path.join(storageRoot, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, params.buffer);

    return {
      storagePath: relativePath,
      absolutePath,
    };
  }

  resolveAbsolutePath(storagePath: string) {
    if (path.isAbsolute(storagePath)) {
      return storagePath;
    }

    return path.join(this.getStorageRoot(), storagePath);
  }

  async deleteStoredFile(storagePath: string) {
    try {
      await unlink(this.resolveAbsolutePath(storagePath));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  }

  private getStorageRoot() {
    const configuredDir = this.configService.get<string>('DOCUMENT_UPLOAD_DIR')?.trim();
    if (configuredDir && configuredDir.length > 0) {
      return configuredDir;
    }

    const aiUploadDir = this.configService.get<string>('AI_UPLOAD_DIR')?.trim();
    if (aiUploadDir && aiUploadDir.length > 0) {
      return path.join(aiUploadDir, 'project-documents');
    }

    return path.resolve(process.cwd(), 'data', 'project-documents');
  }
}

function sanitizeFilename(filename: string) {
  const base = path.basename(filename).replace(/[^A-Za-z0-9._-]+/g, '_');
  const trimmed = base.replace(/^_+|_+$/g, '');
  return trimmed.length > 0 ? trimmed.slice(0, 180) : 'document';
}

function toPosixPath(value: string) {
  return value.split(path.sep).join(path.posix.sep);
}
