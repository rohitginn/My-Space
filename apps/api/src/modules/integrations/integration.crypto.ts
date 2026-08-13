import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

function encryptionKey() {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new AppError('Integration token encryption is not configured', 503, 'INTEGRATION_ENCRYPTION_NOT_CONFIGURED');
  }
  return Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, 'hex');
}

export function encryptIntegrationSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptIntegrationSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new AppError('Integration credential is invalid', 500, 'INTEGRATION_CREDENTIAL_INVALID');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Integration credential could not be decrypted', 500, 'INTEGRATION_CREDENTIAL_INVALID');
  }
}
