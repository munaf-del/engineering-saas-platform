import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiAssistantProviderStatus } from '@eng/shared';
import { assistantResponseSchema } from '../assistant-response.schema';
import type {
  AssistantProviderAdapter,
  AssistantProviderCredentialInput,
  AssistantProviderRequest,
} from './assistant-provider.interface';

const GEMINI_CREDENTIAL_TEST_MODEL = 'gemini-2.0-flash';

@Injectable()
export class GeminiAssistantProvider implements AssistantProviderAdapter {
  readonly provider = 'gemini' as const;

  private geminiClient: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  getProviderStatus(options: AssistantProviderCredentialInput = {}): AiAssistantProviderStatus {
    const apiKey = options.apiKey?.trim();
    const environmentApiKey = this.getEnvironmentApiKey();
    const hasStoredCredential = options.hasStoredCredential ?? false;

    if (apiKey) {
      return {
        configuredForOrganisation: true,
        available: true,
        availabilitySource: 'organisation',
        statusReason: 'organisation_credential',
      };
    }

    return {
      configuredForOrganisation: hasStoredCredential,
      available: Boolean(environmentApiKey),
      availabilitySource: environmentApiKey ? 'environment' : 'unavailable',
      statusReason:
        hasStoredCredential && !apiKey
          ? 'credential_unusable'
          : environmentApiKey
            ? 'environment_fallback'
            : 'not_configured',
    };
  }

  async verifyCredential(apiKey: string) {
    const model = this.getGenerativeModel(apiKey, GEMINI_CREDENTIAL_TEST_MODEL);
    await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Reply with OK.' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8,
        temperature: 0,
      },
    });
  }

  async respondToAssistant(
    {
      model,
      systemPrompt,
      promptContext,
      conversation,
      responseFormatDescription,
      noPayloadErrorMessage,
    }: AssistantProviderRequest,
    credential?: AssistantProviderCredentialInput,
  ) {
    const geminiModel = this.getGenerativeModel(credential?.apiKey, model, systemPrompt);
    const response = await geminiModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: buildGeminiAssistantPrompt({
                promptContext,
                conversation,
                responseFormatDescription,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const responseText = response.response.text().trim();
    if (!responseText) {
      throw new Error(noPayloadErrorMessage);
    }

    return assistantResponseSchema.parse(JSON.parse(extractJsonText(responseText)));
  }

  private getGenerativeModel(
    apiKeyOverride: string | null | undefined,
    model: string,
    systemInstruction?: string,
  ) {
    const apiKey = apiKeyOverride?.trim();
    const client = apiKey ? new GoogleGenerativeAI(apiKey) : this.getGeminiClient();

    return client.getGenerativeModel({
      model,
      ...(systemInstruction ? { systemInstruction } : {}),
    });
  }

  private getGeminiClient() {
    if (this.geminiClient) {
      return this.geminiClient;
    }

    const environmentApiKey = this.getEnvironmentApiKey();
    if (!environmentApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured');
    }

    this.geminiClient = new GoogleGenerativeAI(environmentApiKey);
    return this.geminiClient;
  }

  private getEnvironmentApiKey() {
    return this.configService.get<string>('GEMINI_API_KEY')?.trim() || null;
  }
}

function buildGeminiAssistantPrompt({
  promptContext,
  conversation,
  responseFormatDescription,
}: {
  promptContext: string;
  conversation: AssistantProviderRequest['conversation'];
  responseFormatDescription: string;
}) {
  const conversationTranscript =
    conversation.length > 0
      ? conversation
          .map(
            (message) =>
              `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`,
          )
          .join('\n\n')
      : 'No prior conversation.';

  return [
    'Return valid JSON only.',
    responseFormatDescription,
    'Use this exact JSON object shape:',
    '{"answer":"","visiblePageFacts":[],"toolFindings":[],"inferredLikelyIssues":[],"standardsReferenceNotes":[],"suggestedNextSteps":[],"suggestedFields":[],"draftActions":[],"limitationNote":null}',
    '',
    'Prompt context:',
    promptContext,
    '',
    'Conversation transcript:',
    conversationTranscript,
  ].join('\n');
}

function extractJsonText(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}
