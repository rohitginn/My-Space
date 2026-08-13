import { createHash, randomBytes } from 'node:crypto';

import { and, eq, gt, isNull, lt } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { integrationOauthStates, workspaceIntegrations } from '../../db/schema/integrations.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership, requireRole } from '../workspaces/workspaces.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { decryptIntegrationSecret, encryptIntegrationSecret } from './integration.crypto.js';
import {
  buildAuthorizationUrl,
  getProvider,
  getProviderCatalog,
  isProviderSlug,
  oauthCallbackUrl,
  plannedProviders,
  providerConfigured,
  type ProviderDefinition,
  type ProviderSlug,
} from './integration.providers.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function hashState(state: string) {
  return createHash('sha256').update(state).digest('hex');
}

function safeJson(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function providerError(provider: ProviderDefinition, detail?: string): AppError {
  return new AppError(`${provider.name} authorization failed${detail ? `: ${detail}` : ''}`, 502, 'INTEGRATION_OAUTH_FAILED');
}

async function postForm(url: string, values: Record<string, string>, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...headers },
    body: new URLSearchParams(values),
  });
  const body = safeJson(await response.json().catch(() => ({})));
  if (!response.ok) throw new AppError('OAuth provider request failed', 502, 'INTEGRATION_PROVIDER_REQUEST_FAILED');
  return body;
}

async function getJson(url: string, token: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...headers } });
  const body = safeJson(await response.json().catch(() => ({})));
  if (!response.ok) throw new AppError('OAuth profile request failed', 502, 'INTEGRATION_PROVIDER_REQUEST_FAILED');
  return body;
}

function scopesFromToken(value: unknown, provider: ProviderDefinition) {
  if (typeof value === 'string') return value.split(/[ ,]+/).filter(Boolean);
  return provider.scopes;
}

async function exchangeCode(provider: ProviderDefinition, code: string) {
  if (provider.family === 'google') {
    const token = await postForm('https://oauth2.googleapis.com/token', {
      code,
      client_id: provider.clientId!,
      client_secret: provider.clientSecret!,
      redirect_uri: oauthCallbackUrl(provider.slug),
      grant_type: 'authorization_code',
    });
    if (typeof token.access_token !== 'string') throw providerError(provider);
    const profile = await getJson('https://openidconnect.googleapis.com/v1/userinfo', token.access_token);
    return {
      accessToken: token.access_token,
      refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : null,
      expiresAt: typeof token.expires_in === 'number' ? new Date(Date.now() + token.expires_in * 1000) : null,
      scopes: scopesFromToken(token.scope, provider),
      externalAccountId: typeof profile.sub === 'string' ? profile.sub : null,
      externalAccountName: typeof profile.email === 'string' ? profile.email : typeof profile.name === 'string' ? profile.name : null,
      metadata: { email: profile.email, picture: profile.picture },
    };
  }

  if (provider.family === 'slack') {
    const token = await postForm('https://slack.com/api/oauth.v2.access', {
      code,
      client_id: provider.clientId!,
      client_secret: provider.clientSecret!,
      redirect_uri: oauthCallbackUrl(provider.slug),
    });
    if (token.ok !== true || typeof token.access_token !== 'string') throw providerError(provider, typeof token.error === 'string' ? token.error : undefined);
    const team = safeJson(token.team);
    const authedUser = safeJson(token.authed_user);
    return {
      accessToken: token.access_token,
      refreshToken: null,
      expiresAt: null,
      scopes: scopesFromToken(token.scope, provider),
      externalAccountId: typeof team.id === 'string' ? team.id : typeof authedUser.id === 'string' ? authedUser.id : null,
      externalAccountName: typeof team.name === 'string' ? team.name : null,
      metadata: { teamId: team.id, teamName: team.name, userId: authedUser.id, botUserId: token.bot_user_id },
    };
  }

  const token = await postForm('https://github.com/login/oauth/access_token', {
    code,
    client_id: provider.clientId!,
    client_secret: provider.clientSecret!,
    redirect_uri: oauthCallbackUrl(provider.slug),
  });
  if (typeof token.access_token !== 'string') throw providerError(provider, typeof token.error_description === 'string' ? token.error_description : undefined);
  const profile = await getJson('https://api.github.com/user', token.access_token, { 'User-Agent': 'MySpace-CoSpace' });
  return {
    accessToken: token.access_token,
    refreshToken: null,
    expiresAt: null,
    scopes: scopesFromToken(token.scope, provider),
    externalAccountId: typeof profile.id === 'number' ? String(profile.id) : null,
    externalAccountName: typeof profile.login === 'string' ? profile.login : null,
    metadata: { login: profile.login, avatarUrl: profile.avatar_url, htmlUrl: profile.html_url },
  };
}

async function revokeProviderGrant(provider: ProviderDefinition, encryptedAccessToken: string) {
  let accessToken: string;
  try {
    accessToken = decryptIntegrationSecret(encryptedAccessToken);
  } catch {
    return;
  }

  try {
    if (provider.family === 'google') {
      await postForm('https://oauth2.googleapis.com/revoke', { token: accessToken }, { Accept: 'application/json' });
      return;
    }

    if (provider.family === 'slack') {
      await postForm('https://slack.com/api/auth.revoke', { token: accessToken });
      return;
    }

    if (provider.clientId && provider.clientSecret) {
      await fetch(`https://api.github.com/applications/${encodeURIComponent(provider.clientId)}/token`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')}`,
          'User-Agent': 'MySpace-CoSpace',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
    }
  } catch {
    // Local disconnect must remain available if a provider is temporarily down.
  }
}

export async function getWorkspaceIntegrations(userId: string, workspaceId: string) {
  const membership = await getMembership(userId, workspaceId);
  const installed = await db.select({
    id: workspaceIntegrations.id,
    provider: workspaceIntegrations.provider,
    status: workspaceIntegrations.status,
    externalAccountName: workspaceIntegrations.externalAccountName,
    scopes: workspaceIntegrations.scopes,
    lastSyncedAt: workspaceIntegrations.lastSyncedAt,
    updatedAt: workspaceIntegrations.updatedAt,
  }).from(workspaceIntegrations).where(eq(workspaceIntegrations.workspaceId, workspaceId));
  return {
    canManage: membership.role === 'owner' || membership.role === 'admin',
    catalog: getProviderCatalog(),
    planned: plannedProviders,
    installed,
  };
}

export async function createAuthorization(userId: string, workspaceId: string, providerSlug: string) {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const provider = getProvider(providerSlug);
  if (!providerConfigured(provider)) throw new AppError(`${provider.name} is not configured by the server`, 503, 'INTEGRATION_PROVIDER_NOT_CONFIGURED');
  await db.delete(integrationOauthStates).where(lt(integrationOauthStates.expiresAt, new Date()));
  const state = randomBytes(32).toString('base64url');
  await db.insert(integrationOauthStates).values({
    stateHash: hashState(state),
    workspaceId,
    userId,
    provider: provider.slug,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
  return { authorizationUrl: buildAuthorizationUrl(provider, state) };
}

async function consumeOauthState(state: string, provider: ProviderSlug) {
  const now = new Date();
  const [claimed] = await db.update(integrationOauthStates)
    .set({ usedAt: now })
    .where(and(
      eq(integrationOauthStates.stateHash, hashState(state)),
      eq(integrationOauthStates.provider, provider),
      isNull(integrationOauthStates.usedAt),
      gt(integrationOauthStates.expiresAt, now),
    ))
    .returning();
  if (!claimed) throw new AppError('OAuth state is invalid or expired', 400, 'INTEGRATION_OAUTH_STATE_INVALID');
  return claimed;
}

export async function completeAuthorization(providerSlug: string, state: string, code: string) {
  if (!isProviderSlug(providerSlug)) throw new AppError('Integration provider not found', 404, 'INTEGRATION_PROVIDER_NOT_FOUND');
  const provider = getProvider(providerSlug);
  const oauthState = await consumeOauthState(state, provider.slug);
  const token = await exchangeCode(provider, code);
  const existing = await db.query.workspaceIntegrations.findFirst({ where: and(eq(workspaceIntegrations.workspaceId, oauthState.workspaceId), eq(workspaceIntegrations.provider, provider.slug)) });
  await db.insert(workspaceIntegrations).values({
    workspaceId: oauthState.workspaceId,
    provider: provider.slug,
    status: 'connected',
    installedById: oauthState.userId,
    externalAccountId: token.externalAccountId,
    externalAccountName: token.externalAccountName,
    accessTokenEncrypted: encryptIntegrationSecret(token.accessToken),
    refreshTokenEncrypted: token.refreshToken ? encryptIntegrationSecret(token.refreshToken) : existing?.refreshTokenEncrypted ?? null,
    tokenExpiresAt: token.expiresAt,
    scopes: token.scopes,
    metadata: token.metadata,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [workspaceIntegrations.workspaceId, workspaceIntegrations.provider],
    set: {
      status: 'connected',
      installedById: oauthState.userId,
      externalAccountId: token.externalAccountId,
      externalAccountName: token.externalAccountName,
      accessTokenEncrypted: encryptIntegrationSecret(token.accessToken),
      refreshTokenEncrypted: token.refreshToken ? encryptIntegrationSecret(token.refreshToken) : existing?.refreshTokenEncrypted ?? null,
      tokenExpiresAt: token.expiresAt,
      scopes: token.scopes,
      metadata: token.metadata,
      updatedAt: new Date(),
    },
  });
  await createNotification({
    userId: oauthState.userId,
    workspaceId: oauthState.workspaceId,
    actorId: oauthState.userId,
    type: 'integration_connected',
    entityType: 'integration',
    payload: { href: `/co-space/${oauthState.workspaceId}/integrations`, provider: provider.name },
  });
  return oauthState;
}

export async function disconnectIntegration(userId: string, workspaceId: string, providerSlug: string) {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const provider = getProvider(providerSlug);
  const existing = await db.query.workspaceIntegrations.findFirst({ where: and(eq(workspaceIntegrations.workspaceId, workspaceId), eq(workspaceIntegrations.provider, provider.slug)) });
  if (!existing) throw new AppError('Integration is not connected', 404, 'INTEGRATION_NOT_CONNECTED');
  await revokeProviderGrant(provider, existing.accessTokenEncrypted);
  await db.delete(workspaceIntegrations).where(eq(workspaceIntegrations.id, existing.id));
  await createNotification({
    userId,
    workspaceId,
    actorId: userId,
    type: 'integration_disconnected',
    entityType: 'integration',
    payload: { href: `/co-space/${workspaceId}/integrations`, provider: provider.name },
  });
}
