import type {
  AiAssistantModelId,
  AiAssistantProvider,
  AiAssistantProviderStatus,
} from '@eng/shared';
import type { AssistantResponse } from '../assistant-response.schema';

export type AssistantProviderMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantProviderCredentialIssue =
  | 'credential_decryption_failed'
  | 'encryption_secret_unavailable';

export type AssistantProviderRequest = {
  model: AiAssistantModelId;
  systemPrompt: string;
  promptContext: string;
  conversation: AssistantProviderMessage[];
  responseFormatName: string;
  responseFormatDescription: string;
  noPayloadErrorMessage: string;
};

export type AssistantProviderCredentialInput = {
  apiKey?: string | null;
  hasStoredCredential?: boolean;
  credentialIssue?: AssistantProviderCredentialIssue | null;
};

export type AssistantProviderCredentialState = Partial<
  Record<AiAssistantProvider, AssistantProviderCredentialInput>
>;

export interface AssistantProviderAdapter {
  readonly provider: AiAssistantProvider;
  getProviderStatus(options?: AssistantProviderCredentialInput): AiAssistantProviderStatus;
  verifyCredential?(apiKey: string): Promise<void>;
  respondToAssistant(
    request: AssistantProviderRequest,
    credential?: AssistantProviderCredentialInput,
  ): Promise<AssistantResponse>;
}
