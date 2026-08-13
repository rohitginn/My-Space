import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

export const providerSlugs = ['gmail', 'slack', 'github', 'google-calendar', 'google-drive'] as const;
export type ProviderSlug = typeof providerSlugs[number];

type ProviderDefinition = {
  slug: ProviderSlug;
  name: string;
  family: 'google' | 'slack' | 'github';
  description: string;
  capabilities: string[];
  scopes: string[];
  requiredEnvironment: string[];
  clientId?: string;
  clientSecret?: string;
};

const googleIdentityScopes = ['openid', 'email', 'profile'];

const definitions: Record<ProviderSlug, ProviderDefinition> = {
  gmail: {
    slug: 'gmail',
    name: 'Gmail',
    family: 'google',
    description: 'Bring shared inbox context into the workspace without sharing passwords.',
    capabilities: ['Read mail', 'Search threads', 'Link conversations'],
    scopes: [...googleIdentityScopes, 'https://www.googleapis.com/auth/gmail.readonly'],
    requiredEnvironment: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
  },
  slack: {
    slug: 'slack',
    name: 'Slack',
    family: 'slack',
    description: 'Connect team channels and send workspace updates where the team already talks.',
    capabilities: ['Read channels', 'Read private channels', 'Send messages'],
    scopes: ['channels:read', 'groups:read', 'chat:write'],
    requiredEnvironment: ['SLACK_OAUTH_CLIENT_ID', 'SLACK_OAUTH_CLIENT_SECRET'],
    clientId: env.SLACK_OAUTH_CLIENT_ID,
    clientSecret: env.SLACK_OAUTH_CLIENT_SECRET,
  },
  github: {
    slug: 'github',
    name: 'GitHub',
    family: 'github',
    description: 'Connect repositories, issues, and pull-request activity to shared work.',
    capabilities: ['Repository access', 'Organizations', 'Profile and email'],
    scopes: ['repo', 'read:org', 'read:user', 'user:email'],
    requiredEnvironment: ['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET'],
    clientId: env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
  },
  'google-calendar': {
    slug: 'google-calendar',
    name: 'Google Calendar',
    family: 'google',
    description: 'Give the workspace read-only visibility into schedules and shared events.',
    capabilities: ['Read calendars', 'View events', 'Link schedules'],
    scopes: [...googleIdentityScopes, 'https://www.googleapis.com/auth/calendar.readonly'],
    requiredEnvironment: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
  },
  'google-drive': {
    slug: 'google-drive',
    name: 'Google Drive',
    family: 'google',
    description: 'Find and reference Drive files while keeping source permissions intact.',
    capabilities: ['Read file metadata', 'Search files', 'Link documents'],
    scopes: [...googleIdentityScopes, 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    requiredEnvironment: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
  },
};

export const plannedProviders = [
  { slug: 'notion', name: 'Notion', description: 'Reference pages and databases from shared work.' },
  { slug: 'linear', name: 'Linear', description: 'Keep product issues and Co-Space projects aligned.' },
  { slug: 'figma', name: 'Figma', description: 'Attach design files and review context.' },
  { slug: 'jira', name: 'Jira', description: 'Connect enterprise project and issue tracking.' },
] as const;

export function isProviderSlug(value: string): value is ProviderSlug {
  return providerSlugs.includes(value as ProviderSlug);
}

export function getProvider(value: string) {
  if (!isProviderSlug(value)) throw new AppError('Integration provider not found', 404, 'INTEGRATION_PROVIDER_NOT_FOUND');
  return definitions[value];
}

export function providerConfigured(provider: ProviderDefinition) {
  return Boolean(env.INTEGRATION_ENCRYPTION_KEY && provider.clientId && provider.clientSecret);
}

export function getProviderCatalog() {
  return providerSlugs.map((slug) => {
    const provider = definitions[slug];
    return {
      slug: provider.slug,
      name: provider.name,
      description: provider.description,
      capabilities: provider.capabilities,
      configured: providerConfigured(provider),
      requiredEnvironment: provider.requiredEnvironment,
    };
  });
}

export function oauthCallbackUrl(provider: ProviderSlug) {
  return `${env.API_ORIGIN}/api/integrations/oauth/${provider}/callback`;
}

export function buildAuthorizationUrl(provider: ProviderDefinition, state: string) {
  if (!providerConfigured(provider)) throw new AppError(`${provider.name} is not configured`, 503, 'INTEGRATION_PROVIDER_NOT_CONFIGURED');
  const redirectUri = oauthCallbackUrl(provider.slug);

  if (provider.family === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: provider.clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    }).toString();
    return url.toString();
  }

  if (provider.family === 'slack') {
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.search = new URLSearchParams({
      client_id: provider.clientId!,
      redirect_uri: redirectUri,
      scope: provider.scopes.join(','),
      state,
    }).toString();
    return url.toString();
  }

  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: provider.clientId!,
    redirect_uri: redirectUri,
    scope: provider.scopes.join(' '),
    state,
  }).toString();
  return url.toString();
}

export type { ProviderDefinition };
