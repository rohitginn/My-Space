import { and, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { badges } from '../../db/schema/badges.js';
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

export async function getBadges(userId: string) {
  return db.select().from(badges).where(eq(badges.userId, userId));
}

export async function checkAndAwardBadges(userId: string) {
  const unlocked = await getBadges(userId);
  const unlockedTypes = new Set(unlocked.map(b => b.type));

  const badgesToAward: Array<{ type: string; title: string; description: string; iconUrl: string }> = [];

  // 1. Focus Time check (Focus Rookie / Deep Work Guru)
  if (!unlockedTypes.has('focus_10') || !unlockedTypes.has('focus_100')) {
    const { pomodoroSessions } = await import('../../db/schema/pomodoroSessions.js');
    const sessions = await db.select().from(pomodoroSessions).where(eq(pomodoroSessions.userId, userId));
    const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;

    if (totalFocusMinutes >= 10 && !unlockedTypes.has('focus_10')) {
      badgesToAward.push({
        type: 'focus_10',
        title: 'Focus Rookie',
        description: 'Spent 10 minutes focusing in the Focus Room.',
        iconUrl: '/images/badges/focus_10.png',
      });
    }
    if (totalFocusMinutes >= 100 && !unlockedTypes.has('focus_100')) {
      badgesToAward.push({
        type: 'focus_100',
        title: 'Deep Work Guru',
        description: 'Spent 100 minutes focusing in the Focus Room.',
        iconUrl: '/images/badges/focus_100.png',
      });
    }
  }

  // 2. Habits Streak check (Streak Starter / Consistency Champion)
  if (!unlockedTypes.has('streak_3') || !unlockedTypes.has('streak_10')) {
    const { listHabits } = await import('../habits/habits.service.js');
    const habitsList = await listHabits(userId);
    const maxStreak = habitsList.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

    if (maxStreak >= 3 && !unlockedTypes.has('streak_3')) {
      badgesToAward.push({
        type: 'streak_3',
        title: 'Streak Starter',
        description: 'Maintain a 3-day habit streak.',
        iconUrl: '/images/badges/streak_3.png',
      });
    }
    if (maxStreak >= 10 && !unlockedTypes.has('streak_10')) {
      badgesToAward.push({
        type: 'streak_10',
        title: 'Consistency Champion',
        description: 'Maintain a 10-day habit streak.',
        iconUrl: '/images/badges/streak_10.png',
      });
    }
  }

  // 3. Goal Getter check (goal_1)
  if (!unlockedTypes.has('goal_1')) {
    const { goals } = await import('../../db/schema/goals.js');
    const userGoals = await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.status, 'completed')));
    if (userGoals.length >= 1) {
      badgesToAward.push({
        type: 'goal_1',
        title: 'Goal Getter',
        description: 'Complete your first personal goal.',
        iconUrl: '/images/badges/goal_1.png',
      });
    }
  }

  // 4. Task Crusher check (task_10)
  if (!unlockedTypes.has('task_10')) {
    const { todos } = await import('../../db/schema/todos.js');
    const completedTodos = await db.select().from(todos).where(and(eq(todos.userId, userId), eq(todos.isCompleted, true)));
    if (completedTodos.length >= 10) {
      badgesToAward.push({
        type: 'task_10',
        title: 'Task Crusher',
        description: 'Complete 10 tasks in your space.',
        iconUrl: '/images/badges/task_10.png',
      });
    }
  }

  // 5. Reflective Mind check (journal_7)
  if (!unlockedTypes.has('journal_7')) {
    const { getJournalStreak } = await import('../journal/journal.service.js');
    const journalStreak = await getJournalStreak(userId);
    if (journalStreak >= 7) {
      badgesToAward.push({
        type: 'journal_7',
        title: 'Reflective Mind',
        description: 'Journal 7 days in a row.',
        iconUrl: '/images/badges/journal_7.png',
      });
    }
  }

  // Insert newly unlocked badges
  for (const badgeInfo of badgesToAward) {
    await db.insert(badges).values({
      userId,
      type: badgeInfo.type,
      title: badgeInfo.title,
      description: badgeInfo.description,
      iconUrl: badgeInfo.iconUrl,
    });
  }
}

export async function addXP(userId: string, amount: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  
  const newXp = (user.xp || 0) + amount;
  // Let's say 1 level = 100 XP
  const newLevel = Math.floor(newXp / 100) + 1;
  
  const [updated] = await db.update(users)
    .set({ xp: newXp, level: newLevel, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ xp: users.xp, level: users.level });

  // Evaluate and award achievements
  await checkAndAwardBadges(userId).catch(err => console.error('Error checking badges:', err));
    
  return updated;
}
