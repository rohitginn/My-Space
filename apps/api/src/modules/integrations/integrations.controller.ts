import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './integrations.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

const callbackRedirect = (workspaceId?: string, result = 'error') => workspaceId
  ? `${env.WEB_ORIGIN}/co-space/${workspaceId}/integrations?integration=${result}`
  : `${env.WEB_ORIGIN}/co-space?integration=${result}`;

export const getWorkspaceIntegrations = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getWorkspaceIntegrations(userId(req), req.params.workspaceId) });
});

export const getPreview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.getIntegrationPreview(userId(req), req.params.workspaceId, req.params.provider) });
});

export const authorize = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.createAuthorization(userId(req), req.params.workspaceId, req.params.provider) });
});

export const callback = asyncHandler(async (req, res) => {
  const provider = req.params.provider;
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const workspaceId = state ? await service.getOauthStateWorkspace(state, provider) : undefined;
  if (typeof req.query.error === 'string') {
    res.redirect(callbackRedirect(workspaceId, 'denied'));
    return;
  }
  if (!state || !code) {
    res.redirect(callbackRedirect(workspaceId, 'error'));
    return;
  }
  try {
    const result = await service.completeAuthorization(provider, state, code);
    res.redirect(callbackRedirect(result.workspaceId, 'connected'));
  } catch {
    res.redirect(callbackRedirect(workspaceId, 'error'));
  }
});

export const disconnect = asyncHandler(async (req, res) => {
  await service.disconnectIntegration(userId(req), req.params.workspaceId, req.params.provider);
  res.status(204).send();
});
