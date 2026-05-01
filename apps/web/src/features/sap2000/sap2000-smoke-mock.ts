import {
  SAP2000_APPROVED_SMOKE_MODEL_PATH,
  type Sap2000AuditListResponse,
  type Sap2000BridgeInfoResponse,
  type Sap2000FrameListResponse,
  type Sap2000HealthResponse,
  type Sap2000JointListResponse,
  type Sap2000LoadCaseListResponse,
  type Sap2000LoadCombinationListResponse,
  type Sap2000LoadPatternListResponse,
  type Sap2000MaterialListResponse,
  type Sap2000OpenModelResponse,
  type Sap2000SectionListResponse,
  type Sap2000SessionResponse,
  type Sap2000StatusResponse,
  type Sap2000Units,
  type Sap2000UnitsResponse,
} from './sap2000-bridge-client';

const correlationId = 'mock-sap2000-correlation-15a';
const modelName = 'smoke_frame_2point.sdb';

export const sap2000SmokeUnits: Sap2000Units = {
  present: 'kN_m_C',
  database: 'kN_m_C',
  length: 'm',
  force: 'kN',
  moment: 'kN-m',
  temperature: 'C',
};

export const sap2000SmokeModelContext = {
  model_path: SAP2000_APPROVED_SMOKE_MODEL_PATH,
  model_name: modelName,
  version_label: 'SAP2000 27.1.0',
  version_number: '27.1.0',
  adapter_mode: 'comtypes',
  units: sap2000SmokeUnits,
  correlation_id: correlationId,
};

export const sap2000SmokeMock = {
  health: {
    ok: true,
    service: 'SAP2000 Local Bridge',
    version: '0.1.0',
    correlation_id: correlationId,
  } satisfies Sap2000HealthResponse,
  bridgeInfo: {
    bridge_version: '0.1.0',
    adapter_mode: 'comtypes',
    read_only: true,
    writeback_enabled: false,
    supported_endpoints: [
      'GET /health',
      'GET /bridge/info',
      'GET /sap2000/status',
      'POST /sap2000/connect',
      'POST /sap2000/open-model',
      'GET /sap2000/model/units',
      'GET /sap2000/model/joints',
      'GET /sap2000/model/frames',
      'GET /sap2000/model/materials',
      'GET /sap2000/model/sections',
      'GET /sap2000/model/load-patterns',
      'GET /sap2000/model/load-cases',
      'GET /sap2000/model/load-combinations',
      'GET /sap2000/audit',
    ],
    correlation_id: correlationId,
  } satisfies Sap2000BridgeInfoResponse,
  status: {
    connected: true,
    launched_by_bridge: false,
    model_open: true,
    model_path: SAP2000_APPROVED_SMOKE_MODEL_PATH,
    model_name: modelName,
    version_label: 'SAP2000 27.1.0',
    version_number: '27.1.0',
    adapter_mode: 'comtypes',
    correlation_id: correlationId,
  } satisfies Sap2000StatusResponse,
  connect: {
    connected: true,
    launched_by_bridge: false,
    version_label: 'SAP2000 27.1.0',
    version_number: '27.1.0',
    adapter_mode: 'comtypes',
    correlation_id: correlationId,
  } satisfies Sap2000SessionResponse,
  openModel: {
    model_open: true,
    model_path: SAP2000_APPROVED_SMOKE_MODEL_PATH,
    model_name: modelName,
    version_label: 'SAP2000 27.1.0',
    version_number: '27.1.0',
    adapter_mode: 'comtypes',
    units: sap2000SmokeUnits,
    correlation_id: correlationId,
  } satisfies Sap2000OpenModelResponse,
  units: sap2000SmokeModelContext satisfies Sap2000UnitsResponse,
  joints: {
    ...sap2000SmokeModelContext,
    joints: [
      { name: '1', coord_system: 'Global', x: 0, y: 0, z: 0, units_ref: 'm' },
      { name: '2', coord_system: 'Global', x: 5, y: 0, z: 0, units_ref: 'm' },
    ],
  } satisfies Sap2000JointListResponse,
  frames: {
    ...sap2000SmokeModelContext,
    frames: [
      { name: '1', start_joint: '1', end_joint: '2', section: 'FSEC1', coord_system: 'Global' },
    ],
  } satisfies Sap2000FrameListResponse,
  materials: {
    ...sap2000SmokeModelContext,
    materials: [{ name: 'A992Fy50' }, { name: '4000Psi' }, { name: 'A416Gr270' }],
  } satisfies Sap2000MaterialListResponse,
  sections: {
    ...sap2000SmokeModelContext,
    sections: [{ name: 'FSEC1' }],
  } satisfies Sap2000SectionListResponse,
  loadPatterns: {
    ...sap2000SmokeModelContext,
    load_patterns: [{ name: 'DEAD' }],
  } satisfies Sap2000LoadPatternListResponse,
  loadCases: {
    ...sap2000SmokeModelContext,
    load_cases: [{ name: 'DEAD' }, { name: 'MODAL' }],
  } satisfies Sap2000LoadCaseListResponse,
  loadCombinations: {
    ...sap2000SmokeModelContext,
    load_combinations: [],
  } satisfies Sap2000LoadCombinationListResponse,
  audit: {
    records: Array.from({ length: 41 }, (_, index) => ({
      audit_id: `mock-audit-${String(index + 1).padStart(2, '0')}`,
      timestamp_utc: '2026-05-01T00:00:00Z',
      correlation_id: correlationId,
      method: 'GET',
      route: '/sap2000/model/joints',
      action: 'Mock read-only metadata check',
      status: 'succeeded',
      adapter_mode: 'comtypes',
      model_path: SAP2000_APPROVED_SMOKE_MODEL_PATH,
    })),
    correlation_id: correlationId,
  } satisfies Sap2000AuditListResponse,
};

export function createSap2000SmokeMockFetch(): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === 'string'
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    const method = init?.method ?? 'GET';
    const route = `${method} ${url.pathname}`;
    const response = responseForRoute(route);

    if (!response) {
      return jsonResponse(
        { error: { bridge_code: 'MOCK_ROUTE_NOT_FOUND', correlation_id: correlationId } },
        404,
      );
    }

    return jsonResponse(response, 200);
  };
}

function responseForRoute(route: string) {
  switch (route) {
    case 'GET /health':
      return sap2000SmokeMock.health;
    case 'GET /bridge/info':
      return sap2000SmokeMock.bridgeInfo;
    case 'GET /sap2000/status':
      return sap2000SmokeMock.status;
    case 'POST /sap2000/connect':
      return sap2000SmokeMock.connect;
    case 'POST /sap2000/open-model':
      return sap2000SmokeMock.openModel;
    case 'GET /sap2000/model/units':
      return sap2000SmokeMock.units;
    case 'GET /sap2000/model/joints':
      return sap2000SmokeMock.joints;
    case 'GET /sap2000/model/frames':
      return sap2000SmokeMock.frames;
    case 'GET /sap2000/model/materials':
      return sap2000SmokeMock.materials;
    case 'GET /sap2000/model/sections':
      return sap2000SmokeMock.sections;
    case 'GET /sap2000/model/load-patterns':
      return sap2000SmokeMock.loadPatterns;
    case 'GET /sap2000/model/load-cases':
      return sap2000SmokeMock.loadCases;
    case 'GET /sap2000/model/load-combinations':
      return sap2000SmokeMock.loadCombinations;
    case 'GET /sap2000/audit':
      return sap2000SmokeMock.audit;
    default:
      return null;
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
