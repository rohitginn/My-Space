import { describe, expect, it } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt.js';

describe('JWT Utilities', () => {
  const samplePayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@myspace.app',
    role: 'user',
  };

  it('signs and verifies access tokens successfully', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const verified = verifyAccessToken(token);
    expect(verified.sub).toBe(samplePayload.sub);
    expect(verified.email).toBe(samplePayload.email);
    expect(verified.role).toBe(samplePayload.role);
  });

  it('signs and verifies refresh tokens successfully', () => {
    const token = signRefreshToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const verified = verifyRefreshToken(token);
    expect(verified.sub).toBe(samplePayload.sub);
    expect(verified.email).toBe(samplePayload.email);
  });

  it('throws an error when verifying an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.string')).toThrow();
  });
});
