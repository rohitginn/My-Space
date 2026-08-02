import { describe, expect, it } from 'vitest';
import {
  createWorkspaceSchema,
  inviteParamsSchema,
  memberParamsSchema,
  updateMemberSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from './workspaces.validators.js';

describe('Workspaces Validators', () => {
  describe('createWorkspaceSchema', () => {
    it('validates a valid workspace creation payload with defaults', () => {
      const result = createWorkspaceSchema.safeParse({ name: 'Acme Studio' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Acme Studio');
        expect(result.data.type).toBe('team');
        expect(result.data.accentColor).toBe('#0f766e');
      }
    });

    it('validates custom type and valid hex accent color', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Design System',
        type: 'study_group',
        accentColor: '#3b82f6',
        description: 'Collaborative canvas for design specs',
      });
      expect(result.success).toBe(true);
    });

    it('fails when name is empty', () => {
      const result = createWorkspaceSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('fails when accentColor is not a valid 6-character hex code', () => {
      const result = createWorkspaceSchema.safeParse({
        name: 'Bad Color Workspace',
        accentColor: 'blue',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateMemberSchema', () => {
    it('allows valid member roles', () => {
      expect(updateMemberSchema.safeParse({ role: 'admin' }).success).toBe(true);
      expect(updateMemberSchema.safeParse({ role: 'member' }).success).toBe(true);
      expect(updateMemberSchema.safeParse({ role: 'viewer' }).success).toBe(true);
    });

    it('rejects invalid member roles like owner or guest', () => {
      expect(updateMemberSchema.safeParse({ role: 'owner' }).success).toBe(false);
      expect(updateMemberSchema.safeParse({ role: 'invalid' }).success).toBe(false);
    });
  });

  describe('inviteParamsSchema', () => {
    it('validates invite code length between 6 and 20 chars', () => {
      expect(inviteParamsSchema.safeParse({ inviteCode: 'ABC12345' }).success).toBe(true);
      expect(inviteParamsSchema.safeParse({ inviteCode: 'short' }).success).toBe(false);
    });
  });

  describe('workspaceIdSchema', () => {
    it('validates a valid UUID string', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(workspaceIdSchema.safeParse({ id: validUuid }).success).toBe(true);
    });

    it('rejects an invalid non-UUID string', () => {
      expect(workspaceIdSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    });
  });
});
