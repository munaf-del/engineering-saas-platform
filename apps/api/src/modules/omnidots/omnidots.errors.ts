export type OmnidotsClientErrorCode =
  | 'api_error'
  | 'http_error'
  | 'invalid_response'
  | 'network_error'
  | 'timeout';

export class OmnidotsClientError extends Error {
  readonly code: OmnidotsClientErrorCode;
  readonly status?: number;
  readonly safeUrl?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: OmnidotsClientErrorCode,
    options?: {
      status?: number;
      safeUrl?: string;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'OmnidotsClientError';
    this.code = code;
    this.status = options?.status;
    this.safeUrl = options?.safeUrl;
    this.details = options?.details;
  }
}

export function isOmnidotsClientError(error: unknown): error is OmnidotsClientError {
  return error instanceof OmnidotsClientError;
}

export function isOmnidotsInvalidTokenError(error: unknown) {
  if (!isOmnidotsClientError(error) || error.code !== 'api_error') {
    return false;
  }

  const apiMessage =
    typeof error.details?.['apiMessage'] === 'string' ? error.details['apiMessage'] : '';
  const message = `${error.message} ${apiMessage}`.toLowerCase();

  return (
    message.includes('token') &&
    (message.includes('invalid') || message.includes('expired') || message.includes('revoked'))
  );
}
