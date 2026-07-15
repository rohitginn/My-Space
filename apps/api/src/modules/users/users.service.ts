import { eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../utils/AppError.js';

export async function getMe(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: false, refreshToken: false },
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
}

export async function updateMe(userId: string, input: Partial<typeof users.$inferInsert>) {
  const [updated] = await db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, userId)).returning({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    bio: users.bio,
    isVerified: users.isVerified,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  });
  if (!updated) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return updated;
}

export async function deleteMe(userId: string) {
  await db.update(users).set({ deletedAt: new Date(), refreshToken: null, updatedAt: new Date() }).where(eq(users.id, userId));
}
