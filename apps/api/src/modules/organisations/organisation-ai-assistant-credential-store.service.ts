import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  type OrganisationAiAssistantProviderCredential,
} from '@prisma/client';
import {
  isAiAssistantProvider,
  type AiAssistantProvider,
} from '@eng/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AssistantProviderCredentialState } from '../ai/providers/assistant-provider.interface';
import {
  encryptOrganisationAiSecret,
  getOrganisationAiProviderCredentialStateFromMetadata,
  getOrganisationAiProviderCredentialStateFromRecords,
  type EncryptedOrganisationAiSecret,
  type StoredOrganisationAiProviderCredentialMap,
} from './organisation-ai-settings';

type StoredCredentialRow = Pick<
  OrganisationAiAssistantProviderCredential,
  'provider' | 'encryptedSecret' | 'updatedAt'
>;
export type OrganisationAiAssistantCredentialStoreClient = {
  organisationAiAssistantProviderCredential: {
    findMany(
      args: Prisma.OrganisationAiAssistantProviderCredentialFindManyArgs,
    ): Promise<StoredCredentialRow[]>;
    upsert(
      args: Prisma.OrganisationAiAssistantProviderCredentialUpsertArgs,
    ): Promise<OrganisationAiAssistantProviderCredential>;
    deleteMany(
      args: Prisma.OrganisationAiAssistantProviderCredentialDeleteManyArgs,
    ): Promise<Prisma.BatchPayload>;
  };
};

@Injectable()
export class OrganisationAiAssistantCredentialStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getCredentialState(
    organisationId: string,
    options?: {
      legacyMetadata?: unknown;
      client?: OrganisationAiAssistantCredentialStoreClient;
    },
  ): Promise<AssistantProviderCredentialState> {
    const legacyCredentialState = options?.legacyMetadata
      ? getOrganisationAiProviderCredentialStateFromMetadata(
          options.legacyMetadata,
          this.resolveEncryptionSecret(),
        )
      : {};

    const storedCredentialState = await this.getCredentialStateFromStore(
      organisationId,
      options?.client,
    );

    return {
      ...legacyCredentialState,
      ...storedCredentialState,
    };
  }

  async setProviderApiKey(
    organisationId: string,
    provider: AiAssistantProvider,
    apiKey: string,
    client?: OrganisationAiAssistantCredentialStoreClient,
  ) {
    const encryptionSecret = this.requireEncryptionSecret();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedApiKey) {
      throw new Error('Assistant provider API key cannot be blank');
    }

    await this.getClient(client).organisationAiAssistantProviderCredential.upsert({
      where: {
        organisationId_provider: {
          organisationId,
          provider,
        },
      },
      create: {
        organisationId,
        provider,
        encryptedSecret: encryptOrganisationAiSecret(
          trimmedApiKey,
          encryptionSecret,
        ) as Prisma.InputJsonValue,
      },
      update: {
        encryptedSecret: encryptOrganisationAiSecret(
          trimmedApiKey,
          encryptionSecret,
        ) as Prisma.InputJsonValue,
      },
    });
  }

  async removeProviderApiKey(
    organisationId: string,
    provider: AiAssistantProvider,
    client?: OrganisationAiAssistantCredentialStoreClient,
  ) {
    await this.getClient(client).organisationAiAssistantProviderCredential.deleteMany({
      where: {
        organisationId,
        provider,
      },
    });
  }

  private async getCredentialStateFromStore(
    organisationId: string,
    client?: OrganisationAiAssistantCredentialStoreClient,
  ): Promise<AssistantProviderCredentialState> {
    let rows: StoredCredentialRow[];

    try {
      rows = await this.getClient(client).organisationAiAssistantProviderCredential.findMany({
        where: { organisationId },
        select: {
          provider: true,
          encryptedSecret: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (!isMissingOrganisationAiAssistantCredentialTableError(error)) {
        throw error;
      }

      return {};
    }

    const providerCredentials = this.toStoredCredentialRecordMap(rows);

    return getOrganisationAiProviderCredentialStateFromRecords(
      providerCredentials,
      this.resolveEncryptionSecret(),
    );
  }

  private toStoredCredentialRecordMap(
    rows: StoredCredentialRow[],
  ): StoredOrganisationAiProviderCredentialMap {
    return Object.fromEntries(
      rows
        .filter(
          (row): row is StoredCredentialRow & { provider: AiAssistantProvider } =>
            isAiAssistantProvider(row.provider),
        )
        .map((row) => [
          row.provider,
          {
            apiKey: row.encryptedSecret as EncryptedOrganisationAiSecret,
            updatedAt: row.updatedAt.toISOString(),
          },
        ]),
    ) as StoredOrganisationAiProviderCredentialMap;
  }

  private getClient(client?: OrganisationAiAssistantCredentialStoreClient) {
    return (client ?? this.prisma) as OrganisationAiAssistantCredentialStoreClient;
  }

  private requireEncryptionSecret() {
    const encryptionSecret = this.resolveEncryptionSecret();

    if (!encryptionSecret) {
      throw new ServiceUnavailableException(
        'Organisation AI credential encryption is unavailable',
      );
    }

    return encryptionSecret;
  }

  private resolveEncryptionSecret() {
    return (
      this.configService.get<string>('AI_ORG_CREDENTIALS_SECRET')?.trim() ||
      this.configService.get<string>('JWT_SECRET')?.trim() ||
      null
    );
  }
}

function isMissingOrganisationAiAssistantCredentialTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2021') {
    return false;
  }

  const table =
    error.meta && typeof error.meta === 'object' && typeof error.meta['table'] === 'string'
      ? error.meta['table']
      : '';

  return (
    table.includes('organisation_ai_assistant_provider_credentials') ||
    error.message.includes('organisation_ai_assistant_provider_credentials')
  );
}
