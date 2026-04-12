'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AI_MODEL_OPTIONS,
  buildOrganisationAiSettingsResponse,
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
  const [assistantModel, setAssistantModel] = useState<AiModelId>('gpt-4.1');
  const [agentModel, setAgentModel] = useState<AiModelId>('gpt-4.1-mini');

  useEffect(() => {
    const nextSettings = aiRuntimeSettings.data ?? fallbackSettings;
    if (!nextSettings) {
      return;
    }

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

  const hasChanges =
    assistantModel !== settings.assistantModel || agentModel !== settings.agentModel;

  async function handleSave() {
    if (!orgId) {
      toast.error('No organisation is selected');
      return;
    }

    try {
      await updateAiRuntimeSettings.mutateAsync({
        assistantModel,
        agentModel,
      });
      toast.success('AI settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI settings');
    }
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
              onClick={handleSave}
              disabled={!hasChanges || updateAiRuntimeSettings.isPending}
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
              Assistant Runtime Models
            </CardTitle>
            <CardDescription>
              These saved selections are read by the backend AI module for Assistant mode and Agent
              mode requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ModelSelectField
              label="Assistant model"
              value={assistantModel}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onValueChange={(value) => setAssistantModel(value)}
              helperText={
                aiRuntimeSettings.data
                  ? `Saved model: ${settings.assistantModel}`
                  : `Fallback model: ${settings.assistantModel}`
              }
            />

            <ModelSelectField
              label="Agent model"
              value={agentModel}
              disabled={!canManage || updateAiRuntimeSettings.isPending}
              onValueChange={(value) => setAgentModel(value)}
              helperText={
                aiRuntimeSettings.data
                  ? `Saved model: ${settings.agentModel}`
                  : `Fallback model: ${settings.agentModel}`
              }
            />

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {hasChanges
                ? 'Unsaved changes are ready to apply.'
                : 'Saved selections are already applied to new assistant and agent requests.'}
            </div>
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
  disabled,
  onValueChange,
  helperText,
}: {
  label: string;
  value: AiModelId;
  disabled: boolean;
  onValueChange: (value: AiModelId) => void;
  helperText: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => onValueChange(nextValue as AiModelId)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AI_MODEL_OPTIONS.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
