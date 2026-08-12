import { createHash, randomBytes } from 'node:crypto';

import { and, count, eq, gt, isNull } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { passwordResetTokens } from '../../db/schema/passwordResetTokens.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../utils/AppError.js';
import { comparePassword, compareToken, hashPassword, hashToken } from '../../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';
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
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

async function issueTokens(user: AuthUser): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db.update(users).set({ refreshToken: await hashToken(refreshToken), updatedAt: new Date() }).where(eq(users.id, user.id));

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_DUPLICATE');

  // Check if this is the first registered user
  const usersCountResult = await db.select({ value: count() }).from(users);
  const isFirstUser = (usersCountResult[0]?.value || 0) === 0;

  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      role: isFirstUser ? 'admin' : 'user',
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

  const now = new Date();
  let newStreak = userRecord.currentStreak || 0;
  
  if (userRecord.lastLoginAt) {
    const { default: dayjs } = await import('dayjs');
    const lastLogin = dayjs(userRecord.lastLoginAt).startOf('day');
    const today = dayjs(now).startOf('day');
    const diff = today.diff(lastLogin, 'day');
    
    if (diff === 1) {
      newStreak += 1;
    } else if (diff > 1) {
      newStreak = 1;
    }
    // If diff === 0, streak remains unchanged
  } else {
    newStreak = 1;
  }

  await db.update(users).set({ lastLoginAt: now, currentStreak: newStreak, updatedAt: now }).where(eq(users.id, userRecord.id));
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

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || user.deletedAt) return;

  const token = randomBytes(32).toString('hex');
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${token}`;
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    logger.info({ email: user.email, resetUrl }, 'password reset link generated');
  } else {
    logger.warn({ email: user.email }, 'password reset requested but no email provider is configured');
  }
}

export async function resetPassword(token: string, nextPassword: string) {
  const now = new Date();
  const tokenHash = hashResetToken(token);
  const [claimed] = await db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
    .returning();

  if (!claimed) throw new AppError('This password reset link is invalid or expired', 400, 'PASSWORD_RESET_TOKEN_INVALID');

  await db.update(users).set({ passwordHash: await hashPassword(nextPassword), refreshToken: null, updatedAt: now }).where(eq(users.id, claimed.userId));
}
