import {
  OMNIDOTS_API_ERROR_FIXTURE,
  OMNIDOTS_API_SUCCESS_FIXTURE,
  OMNIDOTS_DETAILED_TRACE_FIXTURE,
  OMNIDOTS_INTEGRATION_ENABLED_ENV,
  OMNIDOTS_INTEGRATION_FEATURE_FLAG,
  OMNIDOTS_MEASURING_POINT_FIXTURE,
  OMNIDOTS_PEAK_RECORD_FIXTURE,
  OMNIDOTS_PROVIDER_DISPLAY_NAME,
  OMNIDOTS_PROVIDER_KEY,
  OMNIDOTS_SECRET_QUERY_PARAM,
  OMNIDOTS_SENSOR_FIXTURE,
  OMNIDOTS_TRACE_LIST_FIXTURE,
  OMNIDOTS_VDV_RECORD_FIXTURE,
  OMNIDOTS_VEFF_RECORD_FIXTURE,
  isOmnidotsIntegrationEnabled,
  omnidotsApiErrorEnvelopeSchema,
  omnidotsApiSuccessEnvelopeSchema,
  omnidotsDetailedTraceItemSchema,
  omnidotsMeasuringPointResponseItemSchema,
  omnidotsPeakRecordResponseItemSchema,
  omnidotsSensorResponseItemSchema,
  omnidotsTraceListItemSchema,
  omnidotsVdvRecordResponseItemSchema,
  omnidotsVeffRecordResponseItemSchema,
} from './index';

describe('omnidots constants and fixtures', () => {
  it('exports the expected provider constants and feature-switch metadata', () => {
    expect(OMNIDOTS_PROVIDER_KEY).toBe('omnidots');
    expect(OMNIDOTS_PROVIDER_DISPLAY_NAME).toBe('Omnidots Honeycomb');
    expect(OMNIDOTS_SECRET_QUERY_PARAM).toBe('token');
    expect(OMNIDOTS_INTEGRATION_FEATURE_FLAG).toBe('omnidotsIntegration');
    expect(OMNIDOTS_INTEGRATION_ENABLED_ENV).toBe('OMNIDOTS_INTEGRATION_ENABLED');
  });

  it('interprets the Omnidots integration env switch conservatively', () => {
    expect(isOmnidotsIntegrationEnabled('true')).toBe(true);
    expect(isOmnidotsIntegrationEnabled(' TRUE ')).toBe(true);
    expect(isOmnidotsIntegrationEnabled('false')).toBe(false);
    expect(isOmnidotsIntegrationEnabled(undefined)).toBe(false);
  });

  it('parses the generic success and error envelopes', () => {
    expect(omnidotsApiSuccessEnvelopeSchema.parse(OMNIDOTS_API_SUCCESS_FIXTURE)).toEqual(
      OMNIDOTS_API_SUCCESS_FIXTURE,
    );
    expect(omnidotsApiErrorEnvelopeSchema.parse(OMNIDOTS_API_ERROR_FIXTURE)).toEqual(
      OMNIDOTS_API_ERROR_FIXTURE,
    );
  });

  it('parses the measuring point and sensor fixtures', () => {
    expect(omnidotsSensorResponseItemSchema.parse(OMNIDOTS_SENSOR_FIXTURE)).toEqual(
      OMNIDOTS_SENSOR_FIXTURE,
    );
    expect(
      omnidotsMeasuringPointResponseItemSchema.parse(OMNIDOTS_MEASURING_POINT_FIXTURE),
    ).toEqual(OMNIDOTS_MEASURING_POINT_FIXTURE);
  });

  it('parses the peak, VDV, and Veff record fixtures', () => {
    expect(omnidotsPeakRecordResponseItemSchema.parse(OMNIDOTS_PEAK_RECORD_FIXTURE)).toEqual(
      OMNIDOTS_PEAK_RECORD_FIXTURE,
    );
    expect(omnidotsVdvRecordResponseItemSchema.parse(OMNIDOTS_VDV_RECORD_FIXTURE)).toEqual(
      OMNIDOTS_VDV_RECORD_FIXTURE,
    );
    expect(omnidotsVeffRecordResponseItemSchema.parse(OMNIDOTS_VEFF_RECORD_FIXTURE)).toEqual(
      OMNIDOTS_VEFF_RECORD_FIXTURE,
    );
  });

  it('parses the trace fixtures', () => {
    expect(omnidotsTraceListItemSchema.parse(OMNIDOTS_TRACE_LIST_FIXTURE)).toEqual(
      OMNIDOTS_TRACE_LIST_FIXTURE,
    );
    expect(omnidotsDetailedTraceItemSchema.parse(OMNIDOTS_DETAILED_TRACE_FIXTURE)).toEqual(
      OMNIDOTS_DETAILED_TRACE_FIXTURE,
    );
  });
});
