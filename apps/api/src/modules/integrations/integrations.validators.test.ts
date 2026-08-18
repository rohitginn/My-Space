import { describe, expect, it } from 'vitest';

import { callbackQuerySchema, providerParamsSchema } from './integrations.validators.js';

describe('Integration route validators', () => {
  it('accepts provider callback success and denial shapes', () => {
    expect(callbackQuerySchema.safeParse({ state: 'state', code: 'code' }).success).toBe(true);
    expect(callbackQuerySchema.safeParse({ state: 'state', error: 'access_denied' }).success).toBe(true);
  });

  it('requires a UUID workspace and a bounded provider slug', () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    expect(providerParamsSchema.safeParse({ workspaceId, provider: 'github' }).success).toBe(true);
    expect(providerParamsSchema.safeParse({ workspaceId: 'workspace', provider: 'github' }).success).toBe(false);
    expect(providerParamsSchema.safeParse({ workspaceId, provider: '' }).success).toBe(false);
  });
});
