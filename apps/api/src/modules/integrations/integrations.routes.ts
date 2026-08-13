import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './integrations.controller.js';
import { callbackQuerySchema, providerParamsSchema, workspaceIntegrationParamsSchema } from './integrations.validators.js';

export const integrationsRoutes = Router();

integrationsRoutes.get('/oauth/:provider/callback', validate({ query: callbackQuerySchema }), controller.callback);
integrationsRoutes.use(authenticate);
integrationsRoutes.get('/workspaces/:workspaceId', validate({ params: workspaceIntegrationParamsSchema }), controller.getWorkspaceIntegrations);
integrationsRoutes.post('/workspaces/:workspaceId/:provider/authorize', validate({ params: providerParamsSchema }), controller.authorize);
integrationsRoutes.delete('/workspaces/:workspaceId/:provider', validate({ params: providerParamsSchema }), controller.disconnect);
