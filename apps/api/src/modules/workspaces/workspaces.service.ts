import { and, asc, count, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { workspaceMembers, workspaces } from '../../db/schema/workspaces.js';
import { AppError } from '../../utils/AppError.js';
import { slugify } from '../../utils/slugify.js';

type WorkspaceInput = { name: string; description?: string | null; type?: 'team' | 'study_group' | 'client'; accentColor?: string };

const makeInviteCode = () => nanoid(12);

async function getMembership(userId: string, workspaceId: string) {
  const membership = await db.query.workspaceMembers.findFirst({ where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)) });
  if (!membership) throw new AppError('Workspace access denied', 403, 'WORKSPACE_ACCESS_DENIED');
  return membership;
}

async function requireRole(userId: string, workspaceId: string, roles: string[]) {
  const membership = await getMembership(userId, workspaceId);
  if (!roles.includes(membership.role)) throw new AppError('Workspace permission denied', 403, 'WORKSPACE_PERMISSION_DENIED');
  return membership;
}

export async function listWorkspaces(userId: string) {
  const rows = await db.select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(asc(workspaces.createdAt));
  return Promise.all(rows.map(async ({ workspace, role }) => ({ ...workspace, role, memberCount: Number((await db.select({ value: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id)))[0]?.value ?? 0) })));
}

export async function getWorkspace(userId: string, workspaceId: string) {
  await getMembership(userId, workspaceId);
  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  if (!workspace) throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  const members = await db.select({ id: workspaceMembers.id, userId: users.id, displayName: users.displayName, email: users.email, avatarUrl: users.avatarUrl, role: workspaceMembers.role, joinedAt: workspaceMembers.joinedAt })
    .from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(eq(workspaceMembers.workspaceId, workspaceId));
  return { ...workspace, members };
}

export async function createWorkspace(userId: string, input: WorkspaceInput) {
  const slugBase = slugify(input.name).slice(0, 82) || 'co-space';
  const [workspace] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(workspaces).values({ ...input, ownerId: userId, slug: `${slugBase}-${nanoid(6).toLowerCase()}`, inviteCode: makeInviteCode() }).returning();
    await tx.insert(workspaceMembers).values({ workspaceId: created.id, userId, role: 'owner' });
    return [created];
  });
  return workspace;
}

export async function updateWorkspace(userId: string, workspaceId: string, input: Partial<WorkspaceInput>) {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const [updated] = await db.update(workspaces).set({ ...input, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId)).returning();
  if (!updated) throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  return updated;
}

export async function deleteWorkspace(userId: string, workspaceId: string) {
  await requireRole(userId, workspaceId, ['owner']);
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

export async function regenerateInvite(userId: string, workspaceId: string) {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const [updated] = await db.update(workspaces).set({ inviteCode: makeInviteCode(), updatedAt: new Date() }).where(eq(workspaces.id, workspaceId)).returning();
  return updated;
}

export async function joinWorkspace(userId: string, inviteCode: string) {
  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.inviteCode, inviteCode) });
  if (!workspace) throw new AppError('Invite link is invalid or expired', 404, 'INVITE_NOT_FOUND');
  const existing = await db.query.workspaceMembers.findFirst({ where: and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, userId)) });
  if (existing) return workspace;
  const [{ value: memberCount }] = await db.select({ value: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
  if (Number(memberCount) >= workspace.maxMembers) throw new AppError('This Co-Space is at its member limit', 409, 'WORKSPACE_FULL');
  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: 'member' });
  return workspace;
}

export async function updateMemberRole(userId: string, workspaceId: string, memberId: string, role: 'admin' | 'member' | 'viewer') {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const target = await db.query.workspaceMembers.findFirst({ where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId)) });
  if (!target) throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
  if (target.role === 'owner') throw new AppError('The owner role cannot be changed', 400, 'OWNER_ROLE_LOCKED');
  const [updated] = await db.update(workspaceMembers).set({ role }).where(eq(workspaceMembers.id, target.id)).returning();
  return updated;
}

export async function removeMember(userId: string, workspaceId: string, memberId: string) {
  const current = await getMembership(userId, workspaceId);
  if (current.role !== 'owner' && current.role !== 'admin' && userId !== memberId) throw new AppError('Workspace permission denied', 403, 'WORKSPACE_PERMISSION_DENIED');
  const target = await db.query.workspaceMembers.findFirst({ where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId)) });
  if (!target) throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
  if (target.role === 'owner') throw new AppError('The workspace owner cannot leave', 400, 'OWNER_CANNOT_LEAVE');
  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, target.id));
}

export { getMembership, requireRole };
