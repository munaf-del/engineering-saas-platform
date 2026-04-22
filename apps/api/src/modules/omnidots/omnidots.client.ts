import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  OMNIDOTS_API_BASE_URL_ENV,
  OMNIDOTS_API_TIMEOUT_MS_ENV,
  OMNIDOTS_DEFAULT_BASE_URL,
  OMNIDOTS_DEFAULT_TIMEOUT_MS,
  OMNIDOTS_GET_PEAK_RECORDS_PATH,
  OMNIDOTS_GET_VDV_RECORDS_PATH,
  OMNIDOTS_GET_VEFF_RECORDS_PATH,
  OMNIDOTS_LIST_MEASURING_POINTS_PATH,
  OMNIDOTS_SECRET_QUERY_PARAM,
  OMNIDOTS_TOKEN_DETAILS_PATH,
} from './omnidots.constants';
import { OmnidotsClientError } from './omnidots.errors';
import {
  buildOmnidotsSafeErrorMessage,
  redactOmnidotsText,
  redactOmnidotsUrl,
} from './omnidots.redaction';
import {
  omnidotsApiErrorEnvelopeSchema,
  omnidotsApiSuccessEnvelopeSchema,
  omnidotsMeasuringPointResponseItemSchema,
  omnidotsPeakRecordResponseItemSchema,
  omnidotsPeakRecordsResponseSchema,
  omnidotsTokenDetailsResponseSchema,
  omnidotsVdvRecordResponseItemSchema,
  omnidotsVdvRecordsResponseSchema,
  omnidotsVeffRecordResponseItemSchema,
  omnidotsVeffRecordsResponseSchema,
  type OmnidotsMeasuringPointResponseItem,
  type OmnidotsPeakRecordResponseItem,
  type OmnidotsTokenDetailsResponse,
  type OmnidotsVdvRecordResponseItem,
  type OmnidotsVeffRecordResponseItem,
} from './omnidots.types';

@Injectable()
export class OmnidotsClient {
  private readonly logger = new Logger(OmnidotsClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>(OMNIDOTS_API_BASE_URL_ENV)?.trim() ||
      OMNIDOTS_DEFAULT_BASE_URL;

    const configuredTimeout = Number(
      this.configService.get<string>(OMNIDOTS_API_TIMEOUT_MS_ENV) ?? '',
    );
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : OMNIDOTS_DEFAULT_TIMEOUT_MS;
  }

  async validateToken(token: string): Promise<OmnidotsTokenDetailsResponse> {
    const payload = await this.getJson(OMNIDOTS_TOKEN_DETAILS_PATH, { token });
    const parsed = omnidotsTokenDetailsResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new OmnidotsClientError(
        'Omnidots token validation returned an invalid payload',
        'invalid_response',
        {
          safeUrl: redactOmnidotsUrl(
            buildOmnidotsUrl(this.baseUrl, OMNIDOTS_TOKEN_DETAILS_PATH, { token }),
          ),
        },
      );
    }

    return parsed.data;
  }

  async listMeasuringPoints(token: string): Promise<OmnidotsMeasuringPointResponseItem[]> {
    const payload = await this.getJsonPayload(OMNIDOTS_LIST_MEASURING_POINTS_PATH, { token });
    return extractMeasuringPointArrayPayload(
      payload,
      OMNIDOTS_LIST_MEASURING_POINTS_PATH,
      token,
      this.baseUrl,
    );
  }

  async getPeakRecords(
    token: string,
    measuringPointId: string | number,
    startTimeMs: number,
    endTimeMs?: number,
  ): Promise<OmnidotsPeakRecordResponseItem[]> {
    const payload = await this.getJson(OMNIDOTS_GET_PEAK_RECORDS_PATH, {
      token,
      measuring_point_id: String(measuringPointId),
      start_time: String(startTimeMs),
      end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
    });
    const parsed = omnidotsPeakRecordsResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new OmnidotsClientError(
        'Omnidots peak records returned an invalid payload',
        'invalid_response',
        {
          safeUrl: redactOmnidotsUrl(
            buildOmnidotsUrl(this.baseUrl, OMNIDOTS_GET_PEAK_RECORDS_PATH, {
              token,
              measuring_point_id: String(measuringPointId),
              start_time: String(startTimeMs),
              end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
            }),
          ),
        },
      );
    }

    return extractArrayPayload(
      parsed.data,
      ['records', 'peak_records'],
      omnidotsPeakRecordResponseItemSchema,
      'peak records',
      OMNIDOTS_GET_PEAK_RECORDS_PATH,
      token,
      this.baseUrl,
    );
  }

  async getVdvRecords(
    token: string,
    measuringPointId: string | number,
    startTimeMs: number,
    endTimeMs?: number,
  ): Promise<OmnidotsVdvRecordResponseItem[]> {
    const payload = await this.getJson(OMNIDOTS_GET_VDV_RECORDS_PATH, {
      token,
      measuring_point_id: String(measuringPointId),
      start_time: String(startTimeMs),
      end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
    });
    const parsed = omnidotsVdvRecordsResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new OmnidotsClientError(
        'Omnidots VDV records returned an invalid payload',
        'invalid_response',
        {
          safeUrl: redactOmnidotsUrl(
            buildOmnidotsUrl(this.baseUrl, OMNIDOTS_GET_VDV_RECORDS_PATH, {
              token,
              measuring_point_id: String(measuringPointId),
              start_time: String(startTimeMs),
              end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
            }),
          ),
        },
      );
    }

    return extractArrayPayload(
      parsed.data,
      ['records', 'vdv_records'],
      omnidotsVdvRecordResponseItemSchema,
      'VDV records',
      OMNIDOTS_GET_VDV_RECORDS_PATH,
      token,
      this.baseUrl,
    );
  }

  async getVeffRecords(
    token: string,
    measuringPointId: string | number,
    startTimeMs: number,
    endTimeMs?: number,
  ): Promise<OmnidotsVeffRecordResponseItem[]> {
    const payload = await this.getJson(OMNIDOTS_GET_VEFF_RECORDS_PATH, {
      token,
      measuring_point_id: String(measuringPointId),
      start_time: String(startTimeMs),
      end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
    });
    const parsed = omnidotsVeffRecordsResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new OmnidotsClientError(
        'Omnidots Veff records returned an invalid payload',
        'invalid_response',
        {
          safeUrl: redactOmnidotsUrl(
            buildOmnidotsUrl(this.baseUrl, OMNIDOTS_GET_VEFF_RECORDS_PATH, {
              token,
              measuring_point_id: String(measuringPointId),
              start_time: String(startTimeMs),
              end_time: endTimeMs === undefined ? undefined : String(endTimeMs),
            }),
          ),
        },
      );
    }

    return extractArrayPayload(
      parsed.data,
      ['records', 'veff_records'],
      omnidotsVeffRecordResponseItemSchema,
      'Veff records',
      OMNIDOTS_GET_VEFF_RECORDS_PATH,
      token,
      this.baseUrl,
    );
  }

  private async getJson(
    path: string,
    params: Record<string, string | undefined>,
  ): Promise<Record<string, unknown>> {
    const payload = await this.getJsonPayload(path, params);
    const safeUrl = redactOmnidotsUrl(buildOmnidotsUrl(this.baseUrl, path, params));

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new OmnidotsClientError('Omnidots returned a non-object JSON payload', 'invalid_response', {
        safeUrl,
      });
    }

    const success = omnidotsApiSuccessEnvelopeSchema.safeParse(payload);
    if (!success.success) {
      throw new OmnidotsClientError(
        'Omnidots returned a payload without a valid ok flag',
        'invalid_response',
        {
          safeUrl,
        },
      );
    }

    return payload as Record<string, unknown>;
  }

  private async getJsonPayload(
    path: string,
    params: Record<string, string | undefined>,
  ): Promise<unknown> {
    const token = params[OMNIDOTS_SECRET_QUERY_PARAM];
    const url = buildOmnidotsUrl(this.baseUrl, path, params);
    const safeUrl = redactOmnidotsUrl(url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new OmnidotsClientError(
          `Omnidots request failed with HTTP ${response.status}`,
          'http_error',
          {
            status: response.status,
            safeUrl,
          },
        );
      }

      const payload = (await response.json()) as unknown;
      if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
        throw new OmnidotsClientError(
          'Omnidots returned a non-object-or-array JSON payload',
          'invalid_response',
          {
            safeUrl,
          },
        );
      }

      if (!Array.isArray(payload)) {
        const apiError = omnidotsApiErrorEnvelopeSchema.safeParse(payload);
        if (apiError.success) {
          const apiMessage = redactOmnidotsText(
            apiError.data.message?.trim() || 'Unknown Omnidots API error',
            [token],
          );
          const help =
            typeof apiError.data.help === 'string'
              ? redactOmnidotsText(apiError.data.help, [token])
              : null;

          throw new OmnidotsClientError(`Omnidots API error: ${apiMessage}`, 'api_error', {
            safeUrl,
            details: {
              apiMessage,
              help,
            },
          });
        }
      }

      return payload;
    } catch (error) {
      if (error instanceof OmnidotsClientError) {
        this.logger.warn(`${error.message} (${safeUrl})`);
        throw error;
      }

      if (isTimeoutError(error)) {
        const timeoutError = new OmnidotsClientError(
          `Omnidots request timed out after ${this.timeoutMs}ms`,
          'timeout',
          {
            safeUrl,
          },
        );
        this.logger.warn(`${timeoutError.message} (${safeUrl})`);
        throw timeoutError;
      }

      const safeMessage = buildOmnidotsSafeErrorMessage(error, [token]);
      const networkError = new OmnidotsClientError(
        `Failed to reach Omnidots: ${safeMessage}`,
        'network_error',
        {
          safeUrl,
        },
      );
      this.logger.warn(`${networkError.message} (${safeUrl})`);
      throw networkError;
    }
  }
}

function extractMeasuringPointArrayPayload(
  payload: unknown,
  path: string,
  token: string,
  baseUrl: string,
): OmnidotsMeasuringPointResponseItem[] {
  const measuringPoints = resolveMeasuringPointArrayCandidate(payload);
  const safeUrl = redactOmnidotsUrl(buildOmnidotsUrl(baseUrl, path, { token }));

  if (!measuringPoints) {
    throw new OmnidotsClientError(
      'Omnidots measuring point response format was not recognised.',
      'invalid_response',
      {
        safeUrl,
      },
    );
  }

  const parsed = z.array(omnidotsMeasuringPointResponseItemSchema).safeParse(measuringPoints);
  if (!parsed.success) {
    throw new OmnidotsClientError(
      'Omnidots measuring point inventory returned an invalid payload',
      'invalid_response',
      {
        safeUrl,
      },
    );
  }

  return parsed.data;
}

function resolveMeasuringPointArrayCandidate(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.measuring_points)) {
    return record.measuring_points;
  }

  if (Array.isArray(record.measuringPoints)) {
    return record.measuringPoints;
  }

  const data = record.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const dataRecord = data as Record<string, unknown>;
  if (Array.isArray(dataRecord.measuring_points)) {
    return dataRecord.measuring_points;
  }

  if (Array.isArray(dataRecord.measuringPoints)) {
    return dataRecord.measuringPoints;
  }

  return null;
}

function extractArrayPayload<TSchema extends z.ZodTypeAny>(
  payload: Record<string, unknown>,
  candidateKeys: string[],
  itemSchema: TSchema,
  label: string,
  path: string,
  token: string,
  baseUrl: string,
): z.infer<TSchema>[] {
  for (const candidateKey of candidateKeys) {
    const rawValue = payload[candidateKey];
    if (!Array.isArray(rawValue)) {
      continue;
    }

    const parsed = z.array(itemSchema).safeParse(rawValue);
    if (!parsed.success) {
      throw new OmnidotsClientError(
        `Omnidots ${label} payload could not be parsed`,
        'invalid_response',
        {
          safeUrl: redactOmnidotsUrl(buildOmnidotsUrl(baseUrl, path, { token })),
        },
      );
    }

    return parsed.data;
  }

  throw new OmnidotsClientError(
    `Omnidots ${label} payload did not include a records array`,
    'invalid_response',
    {
      safeUrl: redactOmnidotsUrl(buildOmnidotsUrl(baseUrl, path, { token })),
    },
  );
}

function buildOmnidotsUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, value);
  }

  return url;
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error.name === 'TimeoutError';
}
