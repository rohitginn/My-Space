import { describe, expect, it } from 'vitest';

import { normalizeInviteCode } from './workspaceInvite';

describe('normalizeInviteCode', () => {
  it('keeps a raw invitation code unchanged', () => {
    expect(normalizeInviteCode(' NK_VdKSk3ZX ')).toBe('NK_VdKSk3ZX');
  });

  it('extracts a code from a full co-space invite URL', () => {
    expect(normalizeInviteCode('http://localhost:3000/co-space/join/NK_VdKSk3ZX')).toBe('NK_VdKSk3ZX');
  });

  it('handles query strings and encoded path segments', () => {
    expect(normalizeInviteCode('https://example.test/co-space/join/NK_VdKSk3ZX?from=share')).toBe('NK_VdKSk3ZX');
  });
});
