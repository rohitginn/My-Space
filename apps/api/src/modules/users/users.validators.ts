import { z } from 'zod';

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
