export const OMNIDOTS_PROVIDER_KEY = 'omnidots' as const;
export const OMNIDOTS_PROVIDER_DISPLAY_NAME = 'Omnidots Honeycomb';

// Omnidots tokens are sent as a query parameter, so later client code must redact this key.
export const OMNIDOTS_SECRET_QUERY_PARAM = 'token' as const;
export const OMNIDOTS_REDACTED_VALUE = '[REDACTED]' as const;

export const OMNIDOTS_DEFAULT_BASE_URL = 'https://honeycomb.omnidots.com' as const;
export const OMNIDOTS_DEFAULT_TIMEOUT_MS = 30_000;

export const OMNIDOTS_TOKEN_DETAILS_PATH = '/api/v1/token_details' as const;
export const OMNIDOTS_LIST_MEASURING_POINTS_PATH = '/api/v1/list_measuring_points' as const;
export const OMNIDOTS_GET_PEAK_RECORDS_PATH = '/api/v1/get_peak_records' as const;
export const OMNIDOTS_GET_VDV_RECORDS_PATH = '/api/v1/get_vdv_records' as const;
export const OMNIDOTS_GET_VEFF_RECORDS_PATH = '/api/v1/get_veff_records' as const;

// The repo uses env-driven feature switches today rather than a centralized flag service.
export const OMNIDOTS_INTEGRATION_FEATURE_FLAG = 'omnidotsIntegration' as const;
export const OMNIDOTS_INTEGRATION_ENABLED_ENV = 'OMNIDOTS_INTEGRATION_ENABLED' as const;
export const OMNIDOTS_API_BASE_URL_ENV = 'OMNIDOTS_API_BASE_URL' as const;
export const OMNIDOTS_API_TIMEOUT_MS_ENV = 'OMNIDOTS_API_TIMEOUT_MS' as const;

export function isOmnidotsIntegrationEnabled(rawValue: string | null | undefined) {
  return rawValue?.trim().toLowerCase() === 'true';
}
