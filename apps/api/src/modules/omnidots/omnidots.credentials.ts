import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const OMNIDOTS_CREDENTIAL_ALGORITHM = 'aes-256-gcm';
const OMNIDOTS_CREDENTIAL_VERSION = 1;

export type EncryptedOmnidotsSecret = {
  version: 1;
  algorithm: typeof OMNIDOTS_CREDENTIAL_ALGORITHM;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export type StoredOmnidotsCredentials = {
  token: EncryptedOmnidotsSecret;
  updatedAt: string;
};

@Injectable()
export class OmnidotsCredentialsService {
  constructor(private readonly configService: ConfigService) {}

  encryptToken(token: string, updatedAt = new Date().toISOString()): StoredOmnidotsCredentials {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new Error('Omnidots token cannot be blank');
    }

    return {
      token: encryptOmnidotsSecret(trimmedToken, this.requireEncryptionSecret()),
      updatedAt,
    };
  }

  decryptToken(credentials: unknown) {
    const storedCredentials = parseStoredOmnidotsCredentials(credentials);
    const encryptionSecret = this.resolveEncryptionSecret();

    if (!encryptionSecret) {
      throw new ServiceUnavailableException('Omnidots credential decryption is unavailable');
    }

    try {
      return decryptOmnidotsSecret(storedCredentials.token, encryptionSecret);
    } catch {
      throw new ServiceUnavailableException('Stored Omnidots credential cannot be decrypted');
    }
  }

  private requireEncryptionSecret() {
    const encryptionSecret = this.resolveEncryptionSecret();

    if (!encryptionSecret) {
      throw new ServiceUnavailableException('Omnidots credential encryption is unavailable');
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

function parseStoredOmnidotsCredentials(value: unknown): StoredOmnidotsCredentials {
  const record = objectValue(value);
  const encryptedToken = isEncryptedSecret(record.token)
    ? record.token
    : isEncryptedSecret(record.apiKey)
      ? record.apiKey
      : null;

  if (!encryptedToken) {
    throw new ServiceUnavailableException('Stored Omnidots credential is unavailable');
  }

  return {
    token: encryptedToken,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
  };
}

function encryptOmnidotsSecret(value: string, encryptionSecret: string): EncryptedOmnidotsSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    OMNIDOTS_CREDENTIAL_ALGORITHM,
    deriveOmnidotsCredentialKey(encryptionSecret),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: OMNIDOTS_CREDENTIAL_VERSION,
    algorithm: OMNIDOTS_CREDENTIAL_ALGORITHM,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptOmnidotsSecret(value: EncryptedOmnidotsSecret, encryptionSecret: string) {
  const decipher = createDecipheriv(
    value.algorithm,
    deriveOmnidotsCredentialKey(encryptionSecret),
    Buffer.from(value.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));

  const decryptedValue = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ])
    .toString('utf8')
    .trim();

  if (!decryptedValue) {
    throw new Error('Stored Omnidots credential is blank after decryption');
  }

  return decryptedValue;
}

function deriveOmnidotsCredentialKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

function isEncryptedSecret(value: unknown): value is EncryptedOmnidotsSecret {
  const record = objectValue(value);

  return (
    record.version === OMNIDOTS_CREDENTIAL_VERSION &&
    record.algorithm === OMNIDOTS_CREDENTIAL_ALGORITHM &&
    typeof record.iv === 'string' &&
    typeof record.authTag === 'string' &&
    typeof record.ciphertext === 'string'
  );
}

function objectValue(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}
