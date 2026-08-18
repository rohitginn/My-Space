import { describe, expect, it } from 'vitest';

import { getProviderCatalog, getProvider, isProviderSlug, plannedProviders } from './integration.providers.js';

describe('Integration provider registry', () => {
  it('exposes the supported connector set with setup metadata', () => {
    const catalog = getProviderCatalog();

    expect(catalog.map((provider) => provider.slug)).toEqual([
      'gmail',
      'slack',
      'github',
      'google-calendar',
      'google-drive',
    ]);
    expect(catalog.every((provider) => provider.requiredEnvironment.length > 0)).toBe(true);
  });

  it('rejects providers outside the explicit OAuth registry', () => {
    expect(isProviderSlug('notion')).toBe(false);
    expect(() => getProvider('notion')).toThrowError('Integration provider not found');
  });

  it('keeps future providers visible without making them connectable', () => {
    expect(plannedProviders.map((provider) => provider.slug)).toEqual(['notion', 'linear', 'figma', 'jira']);
  });
});
