import { eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../utils/AppError.js';
import { comparePassword, compareToken, hashPassword, hashToken } from '../../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import type { AuthTokens, AuthUser } from './auth.types.js';

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

async function issueTokens(user: AuthUser): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db.update(users).set({ refreshToken: await hashToken(refreshToken), updatedAt: new Date() }).where(eq(users.id, user.id));

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_DUPLICATE');

  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
    })
    .returning();

  const user = toAuthUser(created);
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const userRecord = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!userRecord || userRecord.deletedAt) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const passwordMatches = await comparePassword(input.password, userRecord.passwordHash);
  if (!passwordMatches) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userRecord.id));
  const user = toAuthUser(userRecord);
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');

  let payload: { sub: string; email: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const userRecord = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!userRecord?.refreshToken) throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');

  const tokenMatches = await compareToken(refreshToken, userRecord.refreshToken);
  if (!tokenMatches) {
    await db.update(users).set({ refreshToken: null, updatedAt: new Date() }).where(eq(users.id, userRecord.id));
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = toAuthUser(userRecord);
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function logout(userId: string) {
  await db.update(users).set({ refreshToken: null, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!userRecord) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const passwordMatches = await comparePassword(currentPassword, userRecord.passwordHash);
  if (!passwordMatches) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(nextPassword), refreshToken: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
