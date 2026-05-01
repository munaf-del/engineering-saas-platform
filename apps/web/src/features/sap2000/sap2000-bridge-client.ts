export const SAP2000_BRIDGE_DEFAULT_BASE_URL = 'http://127.0.0.1:8765';
export const SAP2000_APPROVED_SMOKE_MODEL_PATH =
  'C:\\SAP2000BridgeWorkspace\\smoke_frame_2point.sdb';
export const SAP2000_READ_ONLY_WARNING =
  'Read-only SAP2000 integration. Real analysis, result extraction, and model write-back are not enabled.';

export const SAP2000_BRIDGE_ENDPOINTS = {
  health: '/health',
  bridgeInfo: '/bridge/info',
  status: '/sap2000/status',
  connect: '/sap2000/connect',
  openModel: '/sap2000/open-model',
  units: '/sap2000/model/units',
  joints: '/sap2000/model/joints',
  frames: '/sap2000/model/frames',
  materials: '/sap2000/model/materials',
  sections: '/sap2000/model/sections',
  loadPatterns: '/sap2000/model/load-patterns',
  loadCases: '/sap2000/model/load-cases',
  loadCombinations: '/sap2000/model/load-combinations',
  audit: '/sap2000/audit',
} as const;

export type Sap2000Units = {
  present: string;
  database: string;
  present_raw?: number | string | null;
  database_raw?: number | string | null;
  length: string;
  force: string;
  moment: string;
  temperature?: string | null;
  mass?: string | null;
  time?: string | null;
};

export type Sap2000BridgeErrorDetails = {
  http_status?: number;
  bridge_code: string;
  message: string;
  sap_ret?: number | null;
  sap_context?: string | null;
  retryable: boolean;
  correlation_id: string;
};

export type Sap2000HealthResponse = {
  ok: boolean;
  service: string;
  version: string;
  correlation_id: string;
};

export type Sap2000BridgeInfoResponse = {
  bridge_version: string;
  adapter_mode: string;
  read_only: boolean;
  writeback_enabled: boolean;
  supported_endpoints: string[];
  correlation_id: string;
};

export type Sap2000StatusResponse = {
  connected: boolean;
  launched_by_bridge: boolean;
  model_open: boolean;
  model_path: string | null;
  model_name: string | null;
  version_label: string | null;
  version_number: number | string | null;
  adapter_mode: string;
  correlation_id: string;
};

export type Sap2000SessionResponse = {
  connected: boolean;
  launched_by_bridge: boolean;
  version_label: string;
  version_number: number | string;
  adapter_mode: string;
  correlation_id: string;
};

export type Sap2000OpenModelResponse = {
  model_open: boolean;
  model_path: string;
  model_name: string;
  version_label: string;
  version_number: number | string;
  adapter_mode: string;
  units: Sap2000Units;
  correlation_id: string;
};

export type Sap2000MetadataContext = {
  model_path: string;
  model_name: string;
  version_label: string;
  version_number: number | string;
  adapter_mode: string;
  units: Sap2000Units;
  correlation_id: string;
};

export type Sap2000Joint = {
  name: string;
  coord_system: string;
  x: number;
  y: number;
  z: number;
  units_ref: string;
};

export type Sap2000Frame = {
  name: string;
  start_joint?: string | null;
  end_joint?: string | null;
  section?: string | null;
  coord_system: string;
};

export type Sap2000Material = {
  name: string;
  material_type?: string | number | null;
};

export type Sap2000Section = {
  name: string;
  shape_type?: string | null;
  material?: string | null;
};

export type Sap2000LoadPattern = {
  name: string;
  load_type?: string | number | null;
  self_weight_multiplier?: number | null;
};

export type Sap2000LoadCase = {
  name: string;
  case_type?: string | number | null;
};

export type Sap2000LoadCombination = {
  name: string;
  items: Array<{ name: string; scale_factor?: number | null }>;
};

export type Sap2000AuditRecord = {
  audit_id: string;
  timestamp_utc: string;
  correlation_id: string;
  method: string;
  route: string;
  action: string;
  status: string;
  adapter_mode: string;
  model_path?: string | null;
  bridge_code?: string | null;
  sap_ret?: number | null;
};

export type Sap2000UnitsResponse = Sap2000MetadataContext;
export type Sap2000JointListResponse = Sap2000MetadataContext & { joints: Sap2000Joint[] };
export type Sap2000FrameListResponse = Sap2000MetadataContext & { frames: Sap2000Frame[] };
export type Sap2000MaterialListResponse = Sap2000MetadataContext & {
  materials: Sap2000Material[];
};
export type Sap2000SectionListResponse = Sap2000MetadataContext & { sections: Sap2000Section[] };
export type Sap2000LoadPatternListResponse = Sap2000MetadataContext & {
  load_patterns: Sap2000LoadPattern[];
};
export type Sap2000LoadCaseListResponse = Sap2000MetadataContext & {
  load_cases: Sap2000LoadCase[];
};
export type Sap2000LoadCombinationListResponse = Sap2000MetadataContext & {
  load_combinations: Sap2000LoadCombination[];
};
export type Sap2000AuditListResponse = {
  records: Sap2000AuditRecord[];
  correlation_id: string;
};

export type Sap2000Metadata = {
  units: Sap2000UnitsResponse | null;
  joints: Sap2000Joint[];
  frames: Sap2000Frame[];
  materials: Sap2000Material[];
  sections: Sap2000Section[];
  loadPatterns: Sap2000LoadPattern[];
  loadCases: Sap2000LoadCase[];
  loadCombinations: Sap2000LoadCombination[];
  auditRecords: Sap2000AuditRecord[];
};

export class Sap2000BridgeError extends Error {
  constructor(public details: Sap2000BridgeErrorDetails) {
    super(details.message);
    this.name = 'Sap2000BridgeError';
  }
}

export function getSap2000BridgeBaseUrl(override?: string) {
  const configured =
    override?.trim() ||
    process.env.NEXT_PUBLIC_SAP2000_BRIDGE_URL?.trim() ||
    SAP2000_BRIDGE_DEFAULT_BASE_URL;

  return normalizeSap2000BridgeBaseUrl(configured);
}

export function normalizeSap2000BridgeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.hostname === '0.0.0.0') {
    throw new Error('SAP2000 bridge base URL must not use 0.0.0.0.');
  }

  return url.toString().replace(/\/+$/, '');
}

export class Sap2000BridgeClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.baseUrl = getSap2000BridgeBaseUrl(baseUrl);
  }

  health() {
    return this.request<Sap2000HealthResponse>(SAP2000_BRIDGE_ENDPOINTS.health);
  }

  bridgeInfo() {
    return this.request<Sap2000BridgeInfoResponse>(SAP2000_BRIDGE_ENDPOINTS.bridgeInfo);
  }

  status() {
    return this.request<Sap2000StatusResponse>(SAP2000_BRIDGE_ENDPOINTS.status);
  }

  connect() {
    return this.request<Sap2000SessionResponse>(SAP2000_BRIDGE_ENDPOINTS.connect, {
      method: 'POST',
      body: { attach_to_running: true },
    });
  }

  openModel(path: string) {
    return this.request<Sap2000OpenModelResponse>(SAP2000_BRIDGE_ENDPOINTS.openModel, {
      method: 'POST',
      body: { path, copy_to_workspace: false },
    });
  }

  units() {
    return this.request<Sap2000UnitsResponse>(SAP2000_BRIDGE_ENDPOINTS.units);
  }

  joints() {
    return this.request<Sap2000JointListResponse>(SAP2000_BRIDGE_ENDPOINTS.joints);
  }

  frames() {
    return this.request<Sap2000FrameListResponse>(SAP2000_BRIDGE_ENDPOINTS.frames);
  }

  materials() {
    return this.request<Sap2000MaterialListResponse>(SAP2000_BRIDGE_ENDPOINTS.materials);
  }

  sections() {
    return this.request<Sap2000SectionListResponse>(SAP2000_BRIDGE_ENDPOINTS.sections);
  }

  loadPatterns() {
    return this.request<Sap2000LoadPatternListResponse>(SAP2000_BRIDGE_ENDPOINTS.loadPatterns);
  }

  loadCases() {
    return this.request<Sap2000LoadCaseListResponse>(SAP2000_BRIDGE_ENDPOINTS.loadCases);
  }

  loadCombinations() {
    return this.request<Sap2000LoadCombinationListResponse>(
      SAP2000_BRIDGE_ENDPOINTS.loadCombinations,
    );
  }

  audit() {
    return this.request<Sap2000AuditListResponse>(SAP2000_BRIDGE_ENDPOINTS.audit);
  }

  async readMetadata(): Promise<Sap2000Metadata> {
    const [
      units,
      joints,
      frames,
      materials,
      sections,
      loadPatterns,
      loadCases,
      loadCombinations,
      audit,
    ] = await Promise.all([
      this.units(),
      this.joints(),
      this.frames(),
      this.materials(),
      this.sections(),
      this.loadPatterns(),
      this.loadCases(),
      this.loadCombinations(),
      this.audit(),
    ]);

    return {
      units,
      joints: joints.joints,
      frames: frames.frames,
      materials: materials.materials,
      sections: sections.sections,
      loadPatterns: loadPatterns.load_patterns,
      loadCases: loadCases.load_cases,
      loadCombinations: loadCombinations.load_combinations,
      auditRecords: audit.records,
    };
  }

  private async request<T>(
    endpoint: (typeof SAP2000_BRIDGE_ENDPOINTS)[keyof typeof SAP2000_BRIDGE_ENDPOINTS],
    options: { method?: 'GET' | 'POST'; body?: unknown } = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const response = await this.fetcher(`${this.baseUrl}${endpoint}`, {
      method,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      throw new Sap2000BridgeError(parseSap2000BridgeError(body, response.status));
    }

    return response.json() as Promise<T>;
  }
}

export function parseSap2000BridgeError(body: unknown, status?: number): Sap2000BridgeErrorDetails {
  const envelope = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const error =
    envelope.error && typeof envelope.error === 'object'
      ? (envelope.error as Record<string, unknown>)
      : envelope;

  return {
    http_status: numberOrUndefined(error.http_status) ?? status,
    bridge_code: stringOrFallback(error.bridge_code, `HTTP_${status ?? 'ERROR'}`),
    message: stringOrFallback(error.message, 'SAP2000 bridge request failed.'),
    sap_ret: numberOrNull(error.sap_ret),
    sap_context: stringOrNull(error.sap_context),
    retryable: Boolean(error.retryable),
    correlation_id: stringOrFallback(error.correlation_id, 'unavailable'),
  };
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' ? value : null;
}
