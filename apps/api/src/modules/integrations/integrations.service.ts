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

async function getIntegrationJson(url: string, token: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...headers } });
  const body = safeJson(await response.json().catch(() => ({})));
  if (!response.ok || body.ok === false) {
    throw new AppError('This connection needs to be reconnected before its data can be read.', 502, 'INTEGRATION_RECONNECT_REQUIRED');
  }
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

type PreviewItem = { id: string; title: string; detail: string; meta?: string; href?: string };

export async function getIntegrationPreview(userId: string, workspaceId: string, providerSlug: string) {
  await getMembership(userId, workspaceId);
  const provider = getProvider(providerSlug);
  const integration = await db.query.workspaceIntegrations.findFirst({
    where: and(eq(workspaceIntegrations.workspaceId, workspaceId), eq(workspaceIntegrations.provider, provider.slug)),
  });
  if (!integration) throw new AppError(`${provider.name} is not connected to this Co-Space`, 404, 'INTEGRATION_NOT_CONNECTED');

  const token = decryptIntegrationSecret(integration.accessTokenEncrypted);
  let items: PreviewItem[] = [];
  let emptyMessage = `Nothing recent was found in ${provider.name}.`;

  if (provider.slug === 'google-calendar') {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.search = new URLSearchParams({ maxResults: '6', orderBy: 'startTime', singleEvents: 'true', timeMin: new Date().toISOString() }).toString();
    const body = await getIntegrationJson(url.toString(), token);
    const events = Array.isArray(body.items) ? body.items : [];
    items = events.map((event) => {
      const value = safeJson(event);
      const start = safeJson(value.start);
      const startValue = typeof start.dateTime === 'string' ? start.dateTime : typeof start.date === 'string' ? start.date : '';
      return { id: String(value.id ?? value.htmlLink ?? value.summary), title: String(value.summary ?? 'Untitled event'), detail: startValue ? new Date(startValue).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : 'No start time', href: typeof value.htmlLink === 'string' ? value.htmlLink : undefined };
    });
    emptyMessage = 'No upcoming events were found in the primary calendar.';
  } else if (provider.slug === 'google-drive') {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.search = new URLSearchParams({ pageSize: '6', orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink)', q: 'trashed = false' }).toString();
    const body = await getIntegrationJson(url.toString(), token);
    const files = Array.isArray(body.files) ? body.files : [];
    items = files.map((file) => {
      const value = safeJson(file);
      return { id: String(value.id ?? value.name), title: String(value.name ?? 'Untitled file'), detail: String(value.mimeType ?? 'Drive file'), meta: typeof value.modifiedTime === 'string' ? `Updated ${new Date(value.modifiedTime).toLocaleDateString('en')}` : undefined, href: typeof value.webViewLink === 'string' ? value.webViewLink : undefined };
    });
    emptyMessage = 'No files were found in the connected Drive account.';
  } else if (provider.slug === 'gmail') {
    const list = await getIntegrationJson('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6&q=is%3Aunread', token);
    const messages = Array.isArray(list.messages) ? list.messages : [];
    const details = await Promise.all(messages.slice(0, 6).map(async (message) => {
      const value = safeJson(message);
      const detail = await getIntegrationJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(String(value.id))}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, token);
      const payload = safeJson(detail.payload);
      const headers = Array.isArray(payload.headers) ? payload.headers : [];
      const header = (name: string) => headers.find((item: unknown) => safeJson(item).name === name);
      const subject = safeJson(header('Subject')).value;
      const from = safeJson(header('From')).value;
      const date = safeJson(header('Date')).value;
      return { id: String(value.id), title: typeof subject === 'string' ? subject : 'Unread message', detail: typeof from === 'string' ? from : 'Gmail message', meta: typeof date === 'string' ? new Date(date).toLocaleDateString('en') : undefined };
    }));
    items = details;
    emptyMessage = 'No unread messages were found.';
  } else if (provider.slug === 'slack') {
    const body = await getIntegrationJson('https://slack.com/api/conversations.list?limit=6&exclude_archived=true', token);
    const channels = Array.isArray(body.channels) ? body.channels : [];
    items = channels.map((channel) => {
      const value = safeJson(channel);
      return { id: String(value.id ?? value.name), title: `#${String(value.name ?? 'channel')}`, detail: value.is_private === true ? 'Private channel' : 'Public channel', meta: typeof value.num_members === 'number' ? `${value.num_members} members` : undefined };
    });
    emptyMessage = 'No accessible Slack channels were found.';
  } else if (provider.slug === 'github') {
    const body = await getIntegrationJson('https://api.github.com/user/repos?sort=updated&per_page=6&affiliation=owner,collaborator,organization_member', token, { 'User-Agent': 'MySpace-CoSpace' });
    const repositories = Array.isArray(body) ? body : [];
    items = repositories.map((repository) => {
      const value = safeJson(repository);
      return { id: String(value.id ?? value.full_name), title: String(value.full_name ?? value.name ?? 'Repository'), detail: typeof value.description === 'string' && value.description ? value.description : 'GitHub repository', meta: typeof value.language === 'string' ? value.language : undefined, href: typeof value.html_url === 'string' ? value.html_url : undefined };
    });
    emptyMessage = 'No repositories were found for this GitHub account.';
  }

  await db.update(workspaceIntegrations).set({ lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(workspaceIntegrations.id, integration.id));
  return { provider: provider.slug, providerName: provider.name, items, emptyMessage, checkedAt: new Date().toISOString() };
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

export async function getOauthStateWorkspace(state: string, providerSlug: string) {
  if (!isProviderSlug(providerSlug)) return undefined;
  const existing = await db.query.integrationOauthStates.findFirst({
    where: and(
      eq(integrationOauthStates.stateHash, hashState(state)),
      eq(integrationOauthStates.provider, providerSlug),
      isNull(integrationOauthStates.usedAt),
      gt(integrationOauthStates.expiresAt, new Date()),
    ),
  });
  return existing?.workspaceId;
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
