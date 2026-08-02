import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './workspaces.controller.js';
import { createWorkspaceSchema, inviteParamsSchema, memberParamsSchema, updateMemberSchema, updateWorkspaceSchema, workspaceIdSchema } from './workspaces.validators.js';

export const workspacesRoutes = Router();

workspacesRoutes.get('/', controller.listWorkspaces);
workspacesRoutes.post('/', validate({ body: createWorkspaceSchema }), controller.createWorkspace);
workspacesRoutes.get('/:id', validate({ params: workspaceIdSchema }), controller.getWorkspace);
workspacesRoutes.patch('/:id', validate({ params: workspaceIdSchema, body: updateWorkspaceSchema }), controller.updateWorkspace);
workspacesRoutes.delete('/:id', validate({ params: workspaceIdSchema }), controller.deleteWorkspace);
workspacesRoutes.post('/:id/invite', validate({ params: workspaceIdSchema }), controller.regenerateInvite);
workspacesRoutes.post('/join/:inviteCode', validate({ params: inviteParamsSchema }), controller.joinWorkspace);
workspacesRoutes.patch('/:id/members/:userId', validate({ params: memberParamsSchema, body: updateMemberSchema }), controller.updateMemberRole);
workspacesRoutes.delete('/:id/members/:userId', validate({ params: memberParamsSchema }), controller.removeMember);
