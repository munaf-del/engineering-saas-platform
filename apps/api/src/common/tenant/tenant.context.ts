import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  organisationId: string;
  userId: string;
}

export const tenantContext = new AsyncLocalStorage<TenantStore>();

export function getCurrentTenant(): TenantStore | undefined {
  return tenantContext.getStore();
}
