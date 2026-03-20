'use client';

import type { OrgRole } from '@eng/shared';
import { useAuth } from '@/lib/auth';

interface PermissionGateProps {
  roles: OrgRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ roles, fallback = null, children }: PermissionGateProps) {
  const { hasOrgRole } = useAuth();
  if (!hasOrgRole(...roles)) return <>{fallback}</>;
  return <>{children}</>;
}
