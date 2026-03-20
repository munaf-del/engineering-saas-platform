import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CalcEngineRequest {
  calcType: string;
  inputs: Record<string, { value: number; unit: string; label: string; source?: string }>;
  loadCombinations: unknown[];
  rulePack: unknown;
  standardsRefs: unknown[];
  options?: { includeIntermediateSteps?: boolean; precisionDigits?: number };
}

export interface CalcEngineDesignCheck {
  pileIndex: number;
  checkType: string;
  limitState: string;
  demandValue: number;
  capacityValue: number;
  utilisationRatio: number;
  reserveCapacity: number;
  status: string;
  governingCombination?: string;
  clauseRef?: string;
  notes?: string;
}

export interface CalcEngineResult {
  requestHash: string;
  outputs: Record<string, unknown>;
  steps: unknown[];
  governingCase?: string;
  warnings: { code: string; message: string; clauseRef?: string }[];
  errors: { code: string; message: string; clauseRef?: string }[];
  standardRefsUsed: unknown[];
  designChecks?: CalcEngineDesignCheck[];
  assumptions?: string[];
  durationMs: number;
}

@Injectable()
export class CalcEngineClient {
  private readonly logger = new Logger(CalcEngineClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('CALC_ENGINE_URL', 'http://localhost:8000');
  }

  async runCalculation(request: CalcEngineRequest): Promise<CalcEngineResult> {
    const url = `${this.baseUrl}/api/v1/calculations/run`;
    this.logger.log(`Sending calculation request to ${url} (type: ${request.calcType})`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Calc engine returned ${response.status}: ${body}`);

        if (response.status === 422) {
          return {
            requestHash: '',
            outputs: {},
            steps: [],
            warnings: [],
            errors: [{ code: 'VALIDATION_ERROR', message: body }],
            standardRefsUsed: [],
            durationMs: 0,
          };
        }

        throw new ServiceUnavailableException(
          `Calc engine returned HTTP ${response.status}`,
        );
      }

      const result = (await response.json()) as CalcEngineResult;
      this.logger.log(`Calculation completed in ${result.durationMs}ms`);
      return result;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`Failed to reach calc engine: ${error}`);
      throw new ServiceUnavailableException(
        'Calculation engine is unavailable. Please try again later.',
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
