import type {
  OmnidotsApiErrorEnvelope,
  OmnidotsApiSuccessEnvelope,
  OmnidotsDetailedTraceItem,
  OmnidotsMeasuringPointResponseItem,
  OmnidotsPeakRecordResponseItem,
  OmnidotsSensorResponseItem,
  OmnidotsTraceListItem,
  OmnidotsVdvRecordResponseItem,
  OmnidotsVeffRecordResponseItem,
} from './omnidots.types';

export const OMNIDOTS_API_SUCCESS_FIXTURE = {
  ok: true,
  account_name: 'Demo Honeycomb Account',
  account_id: 544,
} satisfies OmnidotsApiSuccessEnvelope;

export const OMNIDOTS_API_ERROR_FIXTURE = {
  ok: false,
  message: 'Token is invalid',
  help: 'Create a new permanent API token in Honeycomb and try again.',
} satisfies OmnidotsApiErrorEnvelope;

export const OMNIDOTS_SENSOR_FIXTURE = {
  connected_using: 'GSM',
  battery_charge: null,
  name: 'BANANA',
  lastseen: '2018-12-14T11:10:32.770645Z',
  online: true,
  location: {
    latitude: 53.00033187866211,
    longitude: 6.554333209991455,
  },
} satisfies OmnidotsSensorResponseItem;

export const OMNIDOTS_MEASURING_POINT_FIXTURE = {
  id: 544,
  name: 'Test',
  active: true,
  building_level: 'lowerLevel',
  category: 'CAT2',
  data_save_level: 10,
  guide_line: 'SBR_A_2010',
  measurement_duration: 2,
  measuring_type: 'indicative',
  timezone: 'Europe/Amsterdam',
  trace_post_trigger: 3,
  trace_pre_trigger: 3,
  trace_save_level: 100,
  vibration_type: 'continuous',
  user_location: {
    latitude: null,
    longitude: null,
  },
  sensor: OMNIDOTS_SENSOR_FIXTURE,
} satisfies OmnidotsMeasuringPointResponseItem;

export const OMNIDOTS_PEAK_RECORD_FIXTURE = {
  timestamp: 12312312312,
  category: 'CAT1',
  measuring_type: 'indicative',
  vibration_type: 'continuous',
  guide_line: 'DIN4150-3',
  x: {
    Fdom: 12.2,
    Vtop: 1.2,
    Atop: 0.4,
  },
  y: {
    Fdom: 3.2,
    Vtop: 0.8,
  },
  z: {
    Fdom: 1.1,
    Vtop: 20.2,
  },
} satisfies OmnidotsPeakRecordResponseItem;

export const OMNIDOTS_VDV_RECORD_FIXTURE = {
  timestamp: 12312312312,
  vdv_period: 5,
  vdv_x: 'BS6841_Wd',
  vdv_y: 'BS6841_Wd',
  vdv_z: 'BS6841_Wb',
  x: 123.4,
  y: 124.4,
  z: 125.4,
} satisfies OmnidotsVdvRecordResponseItem;

export const OMNIDOTS_VEFF_RECORD_FIXTURE = {
  timestamp: 12312312312,
  x: 123.4,
  y: 124.4,
  z: 125.4,
} satisfies OmnidotsVeffRecordResponseItem;

export const OMNIDOTS_TRACE_LIST_FIXTURE = {
  start_time: 1775435104125,
  end_time: 1776039904125,
  sample_frequency_hz: 1000,
  unit: 'mm/s',
  measuring_point_id: 43825,
  datatype: 'vtop',
} satisfies OmnidotsTraceListItem;

export const OMNIDOTS_DETAILED_TRACE_FIXTURE = {
  start_time: 1775435104125,
  end_time: 1775435107125,
  sample_frequency_hz: 1000,
  unit: 'mm/s',
  x: [0.12, -0.08, 0.03],
  y: [0.09, -0.02, 0.01],
  z: [0.31, -0.15, 0.07],
} satisfies OmnidotsDetailedTraceItem;
