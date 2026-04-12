'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useRef } from 'react';
import {
  MULTI_PILE_PROJECT_MAP_SOURCES,
  MULTI_PILE_PROJECT_STATUSES,
  type MultiPileProjectSpecifics,
} from '@eng/shared';
import { ExternalLink, ImagePlus, MapPinned, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { resolveSiteMapEmbedUrl, resolveSiteMapPreview } from './project-specifics-utils';

interface ProjectDetailsEditorProps {
  value: MultiPileProjectSpecifics;
  onChange: (value: MultiPileProjectSpecifics) => void;
}

export function ProjectDetailsEditor({ value, onChange }: ProjectDetailsEditorProps) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const { identity, reportMeta } = value;
  const siteMapPreview = resolveSiteMapPreview(identity);
  const siteMapEmbedUrl = resolveSiteMapEmbedUrl(identity);

  function updateProjectSpecifics(
    updater: (current: MultiPileProjectSpecifics) => MultiPileProjectSpecifics,
  ) {
    onChange(updater(value));
  }

  function updateIdentity<K extends keyof MultiPileProjectSpecifics['identity']>(
    key: K,
    nextValue: MultiPileProjectSpecifics['identity'][K],
  ) {
    updateProjectSpecifics((current) => ({
      ...current,
      identity: {
        ...current.identity,
        [key]: nextValue,
      },
    }));
  }

  function updateReportMeta<K extends keyof MultiPileProjectSpecifics['reportMeta']>(
    key: K,
    nextValue: MultiPileProjectSpecifics['reportMeta'][K],
  ) {
    updateProjectSpecifics((current) => ({
      ...current,
      reportMeta: {
        ...current.reportMeta,
        [key]: nextValue,
      },
    }));
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateIdentity('projectLogo', reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Identity</CardTitle>
          <CardDescription>
            Project-wide identity, status, location, notes, archival state, and logo preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <LabeledField label="Project Number">
            <Input
              value={identity.projectNumber}
              placeholder="e.g. 5605"
              onChange={(event) => updateIdentity('projectNumber', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Project Name">
            <Input
              value={identity.projectName}
              placeholder="Enter project name"
              onChange={(event) => updateIdentity('projectName', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Client">
            <Input
              value={identity.client}
              placeholder="Client / builder / architect"
              onChange={(event) => updateIdentity('client', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Status">
            <Select
              value={identity.status}
              onValueChange={(nextValue) =>
                updateIdentity(
                  'status',
                  nextValue as MultiPileProjectSpecifics['identity']['status'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MULTI_PILE_PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledField>
          <LabeledField label="Address" className="md:col-span-2">
            <Input
              value={identity.address}
              placeholder="Street, suburb, state, postcode"
              onChange={(event) => updateIdentity('address', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Latitude">
            <Input
              value={identity.latitude}
              placeholder="e.g. -33.8688"
              onChange={(event) => updateIdentity('latitude', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Longitude">
            <Input
              value={identity.longitude}
              placeholder="e.g. 151.2093"
              onChange={(event) => updateIdentity('longitude', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Map Search Override" className="md:col-span-2">
            <Input
              value={identity.mapAddress}
              placeholder="Optional map-specific search text"
              onChange={(event) => updateIdentity('mapAddress', event.target.value)}
            />
          </LabeledField>
          <div className="md:col-span-2 rounded-lg border border-dashed border-border/80 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <Label>Project Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a logo once here for future report and project previews.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload Logo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateIdentity('projectLogo', '')}
                    disabled={!identity.projectLogo}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Logo
                  </Button>
                </div>
              </div>
              <div className="w-full max-w-sm rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Preview
                </div>
                {identity.projectLogo ? (
                  <div className="flex min-h-28 items-center justify-center rounded-md bg-background p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={identity.projectLogo}
                      alt="Project logo preview"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed bg-background px-4 text-sm text-muted-foreground">
                    No logo uploaded yet
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
                checked={identity.archived}
                onChange={(event) => updateIdentity('archived', event.target.checked)}
              />
              Archived project
            </label>
          </div>
          <LabeledField label="Project Notes" className="md:col-span-2">
            <Textarea
              value={identity.notes}
              placeholder="Scope, package notes, site commentary, etc."
              onChange={(event) => updateIdentity('notes', event.target.value)}
            />
          </LabeledField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Metadata</CardTitle>
          <CardDescription>
            Report-facing document fields used across project outputs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LabeledField label="Report Title">
            <Input
              value={reportMeta.reportTitle}
              placeholder="Project Design Justification"
              onChange={(event) => updateReportMeta('reportTitle', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Revision">
            <Input
              value={reportMeta.reportRevision}
              placeholder="e.g. Rev C"
              onChange={(event) => updateReportMeta('reportRevision', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Issue Date">
            <Input
              value={reportMeta.issueDate}
              placeholder="YYYY-MM-DD"
              onChange={(event) => updateReportMeta('issueDate', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Prepared By">
            <Input
              value={reportMeta.preparedBy}
              placeholder="Designer"
              onChange={(event) => updateReportMeta('preparedBy', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Checked By">
            <Input
              value={reportMeta.checkedBy}
              placeholder="Checker"
              onChange={(event) => updateReportMeta('checkedBy', event.target.value)}
            />
          </LabeledField>
          <LabeledField label="Purpose">
            <Input
              value={reportMeta.purpose}
              placeholder="Issue purpose / package"
              onChange={(event) => updateReportMeta('purpose', event.target.value)}
            />
          </LabeledField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site Map</CardTitle>
          <CardDescription>
            Choose how the embedded preview resolves the site: auto, address, or coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MULTI_PILE_PROJECT_MAP_SOURCES.map((source) => (
              <Button
                key={source}
                type="button"
                size="sm"
                variant={identity.mapSource === source ? 'default' : 'outline'}
                onClick={() =>
                  updateIdentity(
                    'mapSource',
                    source as MultiPileProjectSpecifics['identity']['mapSource'],
                  )
                }
              >
                {source === 'auto'
                  ? 'Auto'
                  : source === 'address'
                    ? 'Use Address'
                    : 'Use Coordinates'}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-xl border bg-muted/10">
              {siteMapEmbedUrl ? (
                <iframe
                  title="Project site map preview"
                  src={siteMapEmbedUrl}
                  className="h-80 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Add an address or coordinates to generate the embedded site-map preview.
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-background p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                <MapPinned className="h-4 w-4 text-muted-foreground" />
                {siteMapPreview.label}
              </div>
              <div className="space-y-4 text-sm">
                <InfoRow label="Search target" value={siteMapPreview.summary} />
                <InfoRow label="Address" value={identity.address || 'Not set'} />
                <InfoRow
                  label="Coordinates"
                  value={
                    identity.latitude && identity.longitude
                      ? `${identity.latitude}, ${identity.longitude}`
                      : 'Not set'
                  }
                />
                <InfoRow label="Map override" value={identity.mapAddress || 'Not set'} />
              </div>
              {siteMapPreview.href ? (
                <a
                  href={siteMapPreview.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Open in Maps
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LabeledField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
