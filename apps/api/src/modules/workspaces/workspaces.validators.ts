import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const workspaceIdSchema = z.object({ id: z.string().uuid() });
export const memberParamsSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() });
export const inviteParamsSchema = z.object({ inviteCode: z.string().min(6).max(20) });
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(['team', 'study_group', 'client']).default('team'),
  accentColor: color.default('#0f766e'),
});
export const updateWorkspaceSchema = createWorkspaceSchema.pick({ name: true, description: true, accentColor: true }).partial();
export const updateMemberSchema = z.object({ role: z.enum(['admin', 'member', 'viewer']) });
