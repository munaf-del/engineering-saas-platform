import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  buildOrganisationAiSettingsResponse,
  normalizeOrganisationAiSettings,
  type AiAssistantProvider,
  type AiAssistantProviderCredentialIssueReason,
  type AiAssistantProviderStatus,
  type OrganisationAiSettings,
  type OrganisationAiSettingsResponse,
} from '@eng/shared';
import type {
  AssistantProviderCredentialIssue,
  AssistantProviderCredentialState,
} from '../ai/providers/assistant-provider.interface';

const ORGANISATION_AI_CREDENTIAL_ALGORITHM = 'aes-256-gcm';
const ORGANISATION_AI_CREDENTIAL_VERSION = 1;

export type EncryptedOrganisationAiSecret = {
  version: 1;
  algorithm: typeof ORGANISATION_AI_CREDENTIAL_ALGORITHM;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export type StoredOrganisationAiProviderCredential = {
  apiKey: EncryptedOrganisationAiSecret;
  updatedAt: string;
};

export type StoredOrganisationAiProviderCredentialMap = Partial<
  Record<AiAssistantProvider, StoredOrganisationAiProviderCredential>
>;

export type DecryptedOrganisationAiSecretResult = {
  apiKey: string | null;
  credentialIssue: AssistantProviderCredentialIssue | null;
};

export function toSafeAiAssistantProviderCredentialIssueReason(
  value: AssistantProviderCredentialIssue | null | undefined,
): AiAssistantProviderCredentialIssueReason | null {
  switch (value) {
    case 'credential_decryption_failed':
      return 'stored_credential_cannot_be_decrypted';
    case 'encryption_secret_unavailable':
      return 'encryption_secret_unavailable';
    default:
      return null;
  }
}

export function getOrganisationAiSettingsFromMetadata(
  metadata: unknown,
  fallback?: Partial<OrganisationAiSettings>,
): OrganisationAiSettings {
  const base = objectValue(metadata);
  return normalizeOrganisationAiSettings(base.aiSettings, fallback);
}

export function buildOrganisationAiSettingsPayload(
  metadata: unknown,
  fallback?: Partial<OrganisationAiSettings>,
  providerStatus?: Partial<Record<AiAssistantProvider, Partial<AiAssistantProviderStatus>>>,
): OrganisationAiSettingsResponse {
  const base = objectValue(metadata);
  return buildOrganisationAiSettingsResponse(base.aiSettings, fallback, providerStatus);
}

export function mergeOrganisationMetadataWithAiSettings(
  metadata: unknown,
  aiSettings: OrganisationAiSettings,
  providerCredentials?: StoredOrganisationAiProviderCredentialMap,
): Record<string, unknown> {
  const base = objectValue(metadata);
  const currentAiSettings = objectValue(base.aiSettings);
  const {
    providerCredentials: _currentProviderCredentials,
    ...currentAiSettingsWithoutCredentials
  } = currentAiSettings;
  const nextProviderCredentials =
    providerCredentials ?? getStoredOrganisationAiProviderCredentialRecordsFromMetadata(metadata);
  const nextAiSettings = {
    ...currentAiSettingsWithoutCredentials,
    ...aiSettings,
    ...(Object.keys(nextProviderCredentials).length > 0
      ? { providerCredentials: nextProviderCredentials }
      : {}),
  };

  return {
    ...base,
    aiSettings: nextAiSettings,
  };
}

export function getStoredOrganisationAiProviderCredentialRecordsFromMetadata(
  metadata: unknown,
): StoredOrganisationAiProviderCredentialMap {
  const base = objectValue(metadata);
  const aiSettings = objectValue(base.aiSettings);
  const providerCredentials = objectValue(aiSettings.providerCredentials);

  return Object.fromEntries(
    Object.entries(providerCredentials).filter(
      (entry): entry is [AiAssistantProvider, StoredOrganisationAiProviderCredential] => {
        const [provider, value] = entry;
        if (!isAiAssistantProvider(provider)) {
          return false;
        }

        const record = objectValue(value);
        return (
          typeof record.updatedAt === 'string' && isEncryptedOrganisationAiSecret(record.apiKey)
        );
      },
    ),
  );
}

export function getOrganisationAiProviderCredentialStateFromMetadata(
  metadata: unknown,
  encryptionSecret?: string | null,
): AssistantProviderCredentialState {
  const providerCredentials =
    getStoredOrganisationAiProviderCredentialRecordsFromMetadata(metadata);

  return getOrganisationAiProviderCredentialStateFromRecords(providerCredentials, encryptionSecret);
}

export function getOrganisationAiProviderCredentialStateFromRecords(
  providerCredentials: StoredOrganisationAiProviderCredentialMap,
  encryptionSecret?: string | null,
): AssistantProviderCredentialState {
  return Object.fromEntries(
    Object.entries(providerCredentials).map(([provider, credential]) => {
      const decrypted = decryptOrganisationAiSecret(credential.apiKey, encryptionSecret);

      return [
        provider,
        {
          hasStoredCredential: true,
          apiKey: decrypted.apiKey,
          ...(decrypted.credentialIssue ? { credentialIssue: decrypted.credentialIssue } : {}),
        },
      ];
    }),
  ) as AssistantProviderCredentialState;
}

export function setOrganisationAiProviderApiKey(
  records: StoredOrganisationAiProviderCredentialMap,
  provider: AiAssistantProvider,
  apiKey: string,
  encryptionSecret: string,
  updatedAt = new Date().toISOString(),
): StoredOrganisationAiProviderCredentialMap {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error('Assistant provider API key cannot be blank');
  }

  return {
    ...records,
    [provider]: {
      apiKey: encryptOrganisationAiSecret(trimmedApiKey, encryptionSecret),
      updatedAt,
    },
  };
}

export function removeOrganisationAiProviderApiKey(
  records: StoredOrganisationAiProviderCredentialMap,
  provider: AiAssistantProvider,
): StoredOrganisationAiProviderCredentialMap {
  const nextRecords = { ...records };
  delete nextRecords[provider];
  return nextRecords;
}

export function isMissingOrganisationMetadataColumnError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2022') {
    return false;
  }

  const column =
    error.meta && typeof error.meta === 'object' && typeof error.meta['column'] === 'string'
      ? error.meta['column']
      : '';

  return column.includes('metadata') || error.message.toLowerCase().includes('metadata');
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export function encryptOrganisationAiSecret(
  value: string,
  encryptionSecret: string,
): EncryptedOrganisationAiSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ORGANISATION_AI_CREDENTIAL_ALGORITHM,
    deriveOrganisationAiCredentialKey(encryptionSecret),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: ORGANISATION_AI_CREDENTIAL_VERSION,
    algorithm: ORGANISATION_AI_CREDENTIAL_ALGORITHM,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptOrganisationAiSecret(
  value: EncryptedOrganisationAiSecret,
  encryptionSecret?: string | null,
): DecryptedOrganisationAiSecretResult {
  if (!encryptionSecret) {
    return {
      apiKey: null,
      credentialIssue: 'encryption_secret_unavailable',
    };
  }

  try {
    const decipher = createDecipheriv(
      value.algorithm,
      deriveOrganisationAiCredentialKey(encryptionSecret),
      Buffer.from(value.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));

    const decryptedValue = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ])
      .toString('utf8')
      .trim();

    return {
      apiKey: decryptedValue || null,
      credentialIssue: decryptedValue ? null : 'credential_decryption_failed',
    };
  } catch {
    return {
      apiKey: null,
      credentialIssue: 'credential_decryption_failed',
    };
  }
}

function deriveOrganisationAiCredentialKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

function isEncryptedOrganisationAiSecret(value: unknown): value is EncryptedOrganisationAiSecret {
  const record = objectValue(value);
  return (
    record.version === ORGANISATION_AI_CREDENTIAL_VERSION &&
    record.algorithm === ORGANISATION_AI_CREDENTIAL_ALGORITHM &&
    typeof record.iv === 'string' &&
    typeof record.authTag === 'string' &&
    typeof record.ciphertext === 'string'
  );
}

function isAiAssistantProvider(value: unknown): value is AiAssistantProvider {
  return value === 'openai' || value === 'anthropic';
}
