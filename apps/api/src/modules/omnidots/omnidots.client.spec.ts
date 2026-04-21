import { ConfigService } from '@nestjs/config';
import {
  OMNIDOTS_MEASURING_POINT_FIXTURE,
  OMNIDOTS_PEAK_RECORD_FIXTURE,
  OMNIDOTS_VDV_RECORD_FIXTURE,
  OMNIDOTS_VEFF_RECORD_FIXTURE,
} from './omnidots.fixtures';
import { OmnidotsClient } from './omnidots.client';

describe('OmnidotsClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let client: OmnidotsClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    client = new OmnidotsClient({
      get: jest.fn(),
    } as unknown as ConfigService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('validates a token with the token_details endpoint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        account_name: 'Demo Honeycomb Account',
        account_id: 544,
      }),
    );

    const result = await client.validateToken('secret-token');

    expect(result.account_name).toBe('Demo Honeycomb Account');
    expect(result.account_id).toBe(544);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('token=secret-token'),
      }),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('surfaces invalid-token API responses without exposing the token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: false,
        message: 'Token is invalid',
      }),
    );

    let thrownError: unknown;
    try {
      await client.validateToken('super-secret-token');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toMatchObject({
      code: 'api_error',
    });
    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain('Token is invalid');
    expect((thrownError as Error).message).not.toContain('super-secret-token');
  });

  it('parses measuring points with sensor metadata', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        measuring_points: [OMNIDOTS_MEASURING_POINT_FIXTURE],
      }),
    );

    const result = await client.listMeasuringPoints('secret-token');

    expect(result).toEqual([OMNIDOTS_MEASURING_POINT_FIXTURE]);
  });

  it('parses inactive measuring points without sensors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        measuring_points: [
          {
            ...OMNIDOTS_MEASURING_POINT_FIXTURE,
            id: 999,
            active: false,
            sensor: null,
          },
        ],
      }),
    );

    const result = await client.listMeasuringPoints('secret-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: 999,
        active: false,
        sensor: null,
      }),
    ]);
  });

  it('parses peak records with Vtop and Fdom axis values', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        records: [OMNIDOTS_PEAK_RECORD_FIXTURE],
      }),
    );

    const result = await client.getPeakRecords('secret-token', 544, 1_000, 2_000);

    expect(result).toEqual([OMNIDOTS_PEAK_RECORD_FIXTURE]);
    const record = result[0]!;
    expect(record.x?.Vtop).toBe(1.2);
    expect(record.x?.Fdom).toBe(12.2);
  });

  it('parses VDV records and preserves VDV metadata fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        vdv_records: [OMNIDOTS_VDV_RECORD_FIXTURE],
      }),
    );

    const result = await client.getVdvRecords('secret-token', 544, 1_000, 2_000);

    expect(result).toEqual([OMNIDOTS_VDV_RECORD_FIXTURE]);
    const record = result[0]!;
    expect(record.vdv_period).toBe(5);
    expect(record.vdv_x).toBe('BS6841_Wd');
  });

  it('parses Veff records with x/y/z values', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        veff_records: [OMNIDOTS_VEFF_RECORD_FIXTURE],
      }),
    );

    const result = await client.getVeffRecords('secret-token', 544, 1_000, 2_000);

    expect(result).toEqual([OMNIDOTS_VEFF_RECORD_FIXTURE]);
    const record = result[0]!;
    expect(record.z).toBe(125.4);
  });

  it('redacts token values from network error paths', async () => {
    fetchMock.mockRejectedValue(
      new Error(
        'Request failed for https://honeycomb.omnidots.com/api/v1/token_details?token=super-secret-token',
      ),
    );

    let thrownError: unknown;
    try {
      await client.validateToken('super-secret-token');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toMatchObject({
      code: 'network_error',
      safeUrl: expect.stringContaining('REDACTED'),
    });
    expect((thrownError as Error).message).toContain('[REDACTED]');
    expect((thrownError as Error).message).not.toContain('super-secret-token');
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
