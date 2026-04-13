'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AI_AGENT_PROVIDER,
  AI_ASSISTANT_PROVIDER_LABELS,
  AI_ASSISTANT_PROVIDER_OPTIONS,
  buildOrganisationAiSettingsResponse,
  getAiAssistantModelsForProvider,
  getDefaultAssistantModelForProvider,
  resolveAiAssistantRuntimeSelection,
  type AiAssistantModelId,
  type AiAssistantProvider,
  type AiAssistantProviderStatus,
  type AiModelId,
} from '@eng/shared';
import { Bot, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAiRuntimeSettings, useUpdateAiRuntimeSettings } from '@/hooks/use-ai';
import { useAuth } from '@/lib/auth';
import { SettingsSectionNav } from '@/features/settings/settings-section-nav';

export default function AiSettingsPage() {
  const { user, currentOrg, hasOrgRole, loading: authLoading } = useAuth();
  const orgId = user?.organisationId ?? '';
  const canManage = hasOrgRole('owner', 'admin');
  const aiRuntimeSettings = useAiRuntimeSettings(orgId);
  const updateAiRuntimeSettings = useUpdateAiRuntimeSettings(orgId);
  const fallbackSettings = useMemo(() => buildOrganisationAiSettingsResponse(null), []);
  const [assistantProvider, setAssistantProvider] = useState<AiAssistantProvider>('openai');
  const [assistantModel, setAssistantModel] = useState<AiAssistantModelId>('gpt-4.1');
  const [agentModel, setAgentModel] = useState<AiModelId>('gpt-4.1-mini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');

  useEffect(() => {
    const nextSettings = aiRuntimeSettings.data ?? fallbackSettings;
    if (!nextSettings) {
      return;
    }

    setAssistantProvider(nextSettings.assistantProvider);
    setAssistantModel(nextSettings.assistantModel);
    setAgentModel(nextSettings.agentModel);
  }, [aiRuntimeSettings.data, fallbackSettings]);

  if (authLoading || (orgId && aiRuntimeSettings.isLoading && !aiRuntimeSettings.data)) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <>
        <SettingsSectionNav />
        <Alert>
          <AlertTitle>No organisation selected</AlertTitle>
          <AlertDescription>
            Sign in with an organisation context to view or change AI runtime settings.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const settings = aiRuntimeSettings.data ?? fallbackSettings;
  const showingFallback = !aiRuntimeSettings.data || aiRuntimeSettings.isError;
  const assistantModelOptions = getAiAssistantModelsForProvider(assistantProvider);
  const assistantRuntime = resolveAiAssistantRuntimeSelection(
    settings,
    settings.assistantProviderStatus,
  );
  const selectedAssistantProviderStatus = settings.assistantProviderStatus[assistantProvider];
  const selectedAssistantProviderUnavailable = !selectedAssistantProviderStatus.available;
  const assistantRuntimeNotice = aiRuntimeSettings.data
    ? buildAssistantRuntimeNotice({
        selectedProvider: assistantProvider,
        selectedProviderStatus: selectedAssistantProviderStatus,
        activeProvider: assistantRuntime.provider,
        activeModel: assistantRuntime.model,
      })
    : null;

  const hasSelectionChanges =
    assistantProvider !== settings.assistantProvider ||
    assistantModel !== settings.assistantModel ||
    agentModel !== settings.agentModel;

  async function updateSettings(
    payload: Parameters<typeof updateAiRuntimeSettings.mutateAsync>[0],
    successMessage: string,
  ) {
    if (!orgId) {
      toast.error('No organisation is selected');
      return;
    }

    try {
      await updateAiRuntimeSettings.mutateAsync(payload);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI settings');
    }
  }

  async function handleSaveSelections() {
    await updateSettings(
      {
        assistantProvider,
        assistantModel,
        agentModel,
      },
      'AI settings saved',
    );
  }

  async function handleSaveProviderApiKey(provider: AiAssistantProvider) {
    const apiKey =
      provider === 'openai'
        ? openaiApiKey
        : provider === 'anthropic'
          ? anthropicApiKey
          : provider === 'gemini'
            ? geminiApiKey
            : deepseekApiKey;
    if (!apiKey.trim()) {
      toast.error('Enter an API key before saving');
      return;
    }

    await updateSettings(
      provider === 'openai'
        ? { openaiApiKey: apiKey.trim() }
        : provider === 'anthropic'
          ? { anthropicApiKey: apiKey.trim() }
          : provider === 'gemini'
            ? { geminiApiKey: apiKey.trim() }
            : { deepseekApiKey: apiKey.trim() },
      `${AI_ASSISTANT_PROVIDER_LABELS[provider]} assistant credentials saved`,
    );

    if (provider === 'openai') {
      setOpenaiApiKey('');
      return;
    }

    if (provider === 'anthropic') {
      setAnthropicApiKey('');
      return;
    }

    if (provider === 'gemini') {
      setGeminiApiKey('');
      return;
    }

    setDeepseekApiKey('');
  }

  async function handleRemoveProviderApiKey(provider: AiAssistantProvider) {
    await updateSettings(
      provider === 'openai'
        ? { removeOpenaiApiKey: true }
        : provider === 'anthropic'
          ? { removeAnthropicApiKey: true }
          : provider === 'gemini'
            ? { removeGeminiApiKey: true }
            : { removeDeepseekApiKey: true },
      `${AI_ASSISTANT_PROVIDER_LABELS[provider]} assistant credentials removed`,
    );
  }

  return (
    <>
      <SettingsSectionNav />

      <PageHeader
        title="AI Settings"
        description="Choose which model powers the floating Assistant and Agent (Beta) modes for this organisation."
        badges={
          currentOrg ? <Badge variant="outline">{currentOrg.name}</Badge> : undefined
        }
        actions={
          canManage ? (
            <Button
              onClick={handleSaveSelections}
              disabled={!hasSelectionChanges || updateAiRuntimeSettings.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateAiRuntimeSettings.isPending ? 'Saving...' : 'Save'}
            </Button>
          ) : undefined
        }
      />

      {!canManage ? (
        <Alert className="mb-6">
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Owner or admin access is required to change these organisation-wide AI settings.
          </AlertDescription>
        </Alert>
      ) : null}

      {showingFallback ? (
        <Alert className="mb-6">
          <AlertTitle>Showing fallback values</AlertTitle>
          <AlertDescription>
            Saved AI settings could not be loaded, so this page is showing safe defaults. The
            assistant runtime will still fall back safely while the backend settings path is
            unavailable.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr),minmax(280px,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Assistant Runtime
            </CardTitle>
            <CardDescription>
              Assistant mode can use OpenAI, Claude, Gemini, or DeepSeek, with
              organisation-level credentials or safe environment fallback where available. Agent
              mode remains OpenAI-only in this phase, and AI Reports indexing, extraction, and
              retrieval also remain OpenAI-only in this pass.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ModelSelectField
              label="Assistant provider"
              value={assistantProvider}
              options={AI_ASSISTANT_PROVIDER_OPTIONS}
              labels={Object.fromEntries(
                AI_ASSISTANT_PROVIDER_OPTIONS.map((provider) => [
                  provider,
                  settings.assistantProviderStatus[provider].available
                    ? AI_ASSISTANT_PROVIDER_LABELS[provider]
                    : `${AI_ASSISTANT_PROVIDER_LABELS[provider]} (unavailable)`,
                ]),
              )}
              disabledOptions={Object.fromEntries(
                AI_ASSISTANT_PROVIDER_OPTIONS.map((provider) => [
                  provider,
                  !settings.assistantProviderStatus[provider].available &&
                    provider !== assistantProvider,
                ]),
              )}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onValueChange={(value) => {
                const nextProvider = value as AiAssistantProvider;
                setAssistantProvider(nextProvider);
                setAssistantModel(getDefaultAssistantModelForProvider(nextProvider));
              }}
              helperText={buildProviderStatusHelperText(
                AI_ASSISTANT_PROVIDER_LABELS[assistantProvider],
                selectedAssistantProviderStatus,
              )}
            />

            <ModelSelectField
              label="Assistant model"
              value={assistantModel}
              options={assistantModelOptions}
              disabled={
                !canManage ||
                updateAiRuntimeSettings.isPending ||
                selectedAssistantProviderUnavailable
              }
              onValueChange={(value) => setAssistantModel(value as AiAssistantModelId)}
              helperText={
                selectedAssistantProviderUnavailable
                  ? selectedAssistantProviderStatus.statusReason === 'credential_unusable'
                    ? buildUnavailableAssistantModelHelperText(
                        selectedAssistantProviderStatus,
                      )
                    : 'This provider is currently unavailable, so assistant chat will not use this model until the provider becomes available again.'
                  : selectedAssistantProviderStatus.statusReason === 'credential_unusable'
                    ? buildFallbackAssistantModelHelperText(
                        selectedAssistantProviderStatus,
                      )
                    : selectedAssistantProviderStatus.statusReason === 'environment_fallback'
                      ? 'Assistant chat currently uses environment fallback for this provider.'
                      : aiRuntimeSettings.data
                        ? `Saved model: ${settings.assistantModel}`
                        : `Fallback model: ${settings.assistantModel}`
              }
            />

            <ModelSelectField
              label="Agent model"
              value={agentModel}
              options={settings.availableAgentModels}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onValueChange={(value) => setAgentModel(value as AiModelId)}
              helperText={
                aiRuntimeSettings.data
                  ? `Saved model: ${settings.agentModel}`
                  : `Fallback model: ${settings.agentModel}`
              }
            />

            {assistantRuntimeNotice ? (
              <Alert>
                <AlertTitle>{assistantRuntimeNotice.title}</AlertTitle>
                <AlertDescription>{assistantRuntimeNotice.description}</AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {hasSelectionChanges
                ? 'Unsaved changes are ready to apply.'
                : 'Saved selections are already applied to new assistant and agent requests.'}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Assistant provider selection only affects Assistant mode. Agent mode and AI Reports
              document indexing, extraction, and retrieval stay on{' '}
              {AI_ASSISTANT_PROVIDER_LABELS[AI_AGENT_PROVIDER]} in this phase.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Credentials</CardTitle>
            <CardDescription>
              Save organisation-scoped assistant API keys here. Stored keys are never returned to
              the browser after save. Providers currently use the same manual API-key flow, with
              environment fallback shown when available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProviderCredentialCard
              provider="openai"
              status={settings.assistantProviderStatus.openai}
              value={openaiApiKey}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onChange={setOpenaiApiKey}
              onSave={() => void handleSaveProviderApiKey('openai')}
              onRemove={() => void handleRemoveProviderApiKey('openai')}
            />
            <ProviderCredentialCard
              provider="anthropic"
              status={settings.assistantProviderStatus.anthropic}
              value={anthropicApiKey}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onChange={setAnthropicApiKey}
              onSave={() => void handleSaveProviderApiKey('anthropic')}
              onRemove={() => void handleRemoveProviderApiKey('anthropic')}
            />
            <ProviderCredentialCard
              provider="gemini"
              status={settings.assistantProviderStatus.gemini}
              value={geminiApiKey}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onChange={setGeminiApiKey}
              onSave={() => void handleSaveProviderApiKey('gemini')}
              onRemove={() => void handleRemoveProviderApiKey('gemini')}
            />
            <ProviderCredentialCard
              provider="deepseek"
              status={settings.assistantProviderStatus.deepseek}
              value={deepseekApiKey}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onChange={setDeepseekApiKey}
              onSave={() => void handleSaveProviderApiKey('deepseek')}
              onRemove={() => void handleRemoveProviderApiKey('deepseek')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Fallback Behavior
            </CardTitle>
            <CardDescription>
              If settings are missing or invalid, the runtime falls back to safe defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="font-medium">Assistant provider default</div>
              <div className="mt-1 text-muted-foreground">
                {AI_ASSISTANT_PROVIDER_LABELS[settings.defaults.assistantProvider]}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="font-medium">Assistant default</div>
              <div className="mt-1 text-muted-foreground">
                {settings.defaults.assistantModel}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="font-medium">Agent default</div>
              <div className="mt-1 text-muted-foreground">{settings.defaults.agentModel}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-muted-foreground">
              Available options are intentionally explicit and small for this first version.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
  }

function ModelSelectField({
  label,
  value,
  options,
  disabled,
  disabledOptions,
  onValueChange,
  helperText,
  labels,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled: boolean;
  disabledOptions?: Record<string, boolean>;
  onValueChange: (value: string) => void;
  helperText: string;
  labels?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((model) => (
            <SelectItem
              key={model}
              value={model}
              disabled={disabledOptions?.[model] ?? false}
            >
              {labels?.[model] ?? model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function ProviderCredentialCard({
  provider,
  status,
  value,
  disabled,
  onChange,
  onSave,
  onRemove,
}: {
  provider: AiAssistantProvider;
  status: AiAssistantProviderStatus;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{AI_ASSISTANT_PROVIDER_LABELS[provider]}</div>
            <span className="text-xs text-muted-foreground">
              {formatConnectionStateLabel(status.connectionState)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {buildProviderStatusHelperText(AI_ASSISTANT_PROVIDER_LABELS[provider], status)}
          </p>
        </div>
        <Badge variant={getProviderStatusBadgeVariant(status)}>
          {getProviderStatusLabel(status)}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`${provider}-assistant-api-key`}>
          {AI_ASSISTANT_PROVIDER_LABELS[provider]} assistant API key
        </Label>
        <Input
          id={`${provider}-assistant-api-key`}
          type="password"
          autoComplete="new-password"
          placeholder={`Paste a new ${AI_ASSISTANT_PROVIDER_LABELS[provider]} assistant API key`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          After save, the stored key is kept server-side only and is not shown again.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || value.trim().length === 0}
          onClick={onSave}
        >
          {status.configuredForOrganisation ? 'Update key' : 'Save key'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !status.configuredForOrganisation}
          onClick={onRemove}
        >
          Remove stored key
        </Button>
      </div>
    </div>
  );
}

function buildProviderStatusHelperText(
  label: string,
  status: AiAssistantProviderStatus,
) {
  if (status.statusReason === 'organisation_credential') {
    return `${label} is configured for this organisation and ready for assistant chat.`;
  }

  if (status.statusReason === 'environment_fallback') {
    return `${label} is available through the current environment fallback for assistant chat.`;
  }

  if (status.statusReason === 'credential_unusable' && status.available) {
    return `${label} ${buildCredentialIssueStatusMessage(status, {
      withFallback: 'so assistant chat is using environment fallback instead.',
      withoutFallback: 'and is currently unavailable.',
    })}`;
  }

  if (status.statusReason === 'credential_unusable') {
    return `${label} ${buildCredentialIssueStatusMessage(status, {
      withFallback: 'so assistant chat is using environment fallback instead.',
      withoutFallback: 'and no environment fallback is available.',
    })}`;
  }

  return `${label} is currently unavailable until assistant credentials are configured.`;
}

function getProviderStatusLabel(status: AiAssistantProviderStatus) {
  if (status.statusReason === 'organisation_credential') {
    return 'Configured';
  }

  if (status.statusReason === 'environment_fallback') {
    return 'Env fallback';
  }

  if (status.statusReason === 'credential_unusable') {
    return status.credentialIssueReason === 'encryption_secret_unavailable'
      ? 'Secret unavailable'
      : status.credentialIssueReason === 'stored_credential_cannot_be_decrypted'
        ? 'Cannot decrypt'
        : 'Credential issue';
  }

  return 'Unavailable';
}

function getProviderStatusBadgeVariant(status: AiAssistantProviderStatus) {
  if (status.statusReason === 'organisation_credential') {
    return 'success' as const;
  }

  if (status.available) {
    return 'warning' as const;
  }

  return 'destructive' as const;
}

function formatConnectionStateLabel(status: AiAssistantProviderStatus['connectionState']) {
  switch (status) {
    case 'manual_key_configured':
      return 'Manual API key';
    case 'env_fallback_active':
      return 'Env fallback';
    case 'connected':
      return 'Connected';
    default:
      return 'Unavailable';
  }
}

function buildAssistantRuntimeNotice({
  selectedProvider,
  selectedProviderStatus,
  activeProvider,
  activeModel,
}: {
  selectedProvider: AiAssistantProvider;
  selectedProviderStatus: AiAssistantProviderStatus;
  activeProvider: AiAssistantProvider;
  activeModel: string;
}) {
  if (selectedProvider !== activeProvider) {
    const issuePrefix =
      selectedProviderStatus.credentialIssueReason ===
      'stored_credential_cannot_be_decrypted'
        ? `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential that cannot currently be decrypted,`
        : selectedProviderStatus.credentialIssueReason ===
            'encryption_secret_unavailable'
          ? `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} has a stored organisation credential, but the organisation encryption secret is currently unavailable,`
          : null;

    return {
      title: 'Assistant runtime fallback is active',
      description: issuePrefix
        ? `${issuePrefix} so assistant chat will fall back to ${AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} with ${activeModel} until the selected provider becomes available again.`
        : `The saved assistant provider is currently unavailable, so assistant chat will fall back to ${AI_ASSISTANT_PROVIDER_LABELS[activeProvider]} with ${activeModel} until the selected provider becomes available again.`,
    };
  }

  if (
    selectedProviderStatus.statusReason === 'credential_unusable' &&
    selectedProviderStatus.available
  ) {
    return {
      title: 'Environment fallback is active',
      description: `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} ${buildCredentialIssueStatusMessage(selectedProviderStatus, {
        withFallback:
          'so assistant chat is using environment fallback right now.',
        withoutFallback: 'and is currently unavailable.',
      })}`,
    };
  }

  if (selectedProviderStatus.statusReason === 'environment_fallback') {
    return {
      title: 'Environment fallback is active',
      description: `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} is currently available through environment fallback because this organisation does not have a stored assistant credential.`,
    };
  }

  if (selectedProviderStatus.statusReason === 'credential_unusable') {
    return {
      title:
        selectedProviderStatus.credentialIssueReason === 'encryption_secret_unavailable'
          ? 'Credential secret unavailable'
          : selectedProviderStatus.credentialIssueReason ===
              'stored_credential_cannot_be_decrypted'
            ? 'Stored credential cannot be decrypted'
            : 'Stored credential is unusable',
      description: `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} ${buildCredentialIssueStatusMessage(selectedProviderStatus, {
        withFallback:
          'so assistant chat is using environment fallback right now.',
        withoutFallback: 'and no environment fallback is available.',
      })}`,
    };
  }

  if (!selectedProviderStatus.available) {
    return {
      title: 'Assistant provider unavailable',
      description: `${AI_ASSISTANT_PROVIDER_LABELS[selectedProvider]} is currently unavailable until assistant credentials are configured or environment fallback is restored.`,
    };
  }

  return null;
}

function buildUnavailableAssistantModelHelperText(status: AiAssistantProviderStatus) {
  if (status.credentialIssueReason === 'stored_credential_cannot_be_decrypted') {
    return 'The stored organisation credential cannot currently be decrypted, and no environment fallback is available.';
  }

  if (status.credentialIssueReason === 'encryption_secret_unavailable') {
    return 'The stored organisation credential cannot currently be used because the organisation encryption secret is unavailable, and no environment fallback is available.';
  }

  return 'This provider has a stored organisation credential issue and no environment fallback is available.';
}

function buildFallbackAssistantModelHelperText(status: AiAssistantProviderStatus) {
  if (status.credentialIssueReason === 'stored_credential_cannot_be_decrypted') {
    return 'Assistant chat can still use this model through environment fallback while the stored organisation credential cannot currently be decrypted.';
  }

  if (status.credentialIssueReason === 'encryption_secret_unavailable') {
    return 'Assistant chat can still use this model through environment fallback while the organisation encryption secret is unavailable.';
  }

  return 'Assistant chat can still use this model through environment fallback while the stored organisation credential is unusable.';
}

function buildCredentialIssueStatusMessage(
  status: AiAssistantProviderStatus,
  messages: {
    withFallback: string;
    withoutFallback: string;
  },
) {
  const prefix =
    status.credentialIssueReason === 'stored_credential_cannot_be_decrypted'
      ? 'has a stored organisation credential that cannot currently be decrypted'
      : status.credentialIssueReason === 'encryption_secret_unavailable'
        ? 'has a stored organisation credential, but the organisation encryption secret is currently unavailable'
        : 'has a stored organisation credential issue';

  return `${prefix}, ${status.available ? messages.withFallback : messages.withoutFallback}`;
}
