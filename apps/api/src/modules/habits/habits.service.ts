import dayjs from 'dayjs';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { habitLogs, habits } from '../../db/schema/habits.js';
import { AppError } from '../../utils/AppError.js';

function calculateStreak(logs: Array<typeof habitLogs.$inferSelect>, targetCount: number) {
  const countByDay = new Map<string, number>();
  for (const log of logs) {
    const day = dayjs(log.logDate).format('YYYY-MM-DD');
    countByDay.set(day, (countByDay.get(day) || 0) + (log.count || 1));
  }

  const loggedDays = new Set(
    Array.from(countByDay.entries())
      .filter(([_, count]) => count >= (targetCount || 1))
      .map(([day]) => day)
  );

  let cursor = dayjs().startOf('day');
  let streak = 0;
  
  if (!loggedDays.has(cursor.format('YYYY-MM-DD'))) {
    cursor = cursor.subtract(1, 'day');
  }
  
  while (loggedDays.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'day');
  }
  return streak;
}

export async function listHabits(userId: string) {
  const rows = await db.select().from(habits).where(eq(habits.userId, userId));
  const result = [];
  const todayStr = dayjs().format('YYYY-MM-DD');
  
  for (const habit of rows) {
    const logs = await db.select().from(habitLogs).where(eq(habitLogs.habitId, habit.id)).orderBy(desc(habitLogs.logDate));
    
    let todayCount = 0;
    for (const log of logs) {
      if (dayjs(log.logDate).format('YYYY-MM-DD') === todayStr) {
        todayCount += log.count || 1;
      }
    }
    
    result.push({ ...habit, currentStreak: calculateStreak(logs, habit.targetCount || 1), todayCount });
  }
  return result;
}

export async function createHabit(userId: string, input: typeof habits.$inferInsert) {
  const [created] = await db.insert(habits).values({ ...input, userId }).returning();
  return created;
}

export async function updateHabit(userId: string, id: string, input: Partial<typeof habits.$inferInsert>) {
  const [updated] = await db.update(habits).set(input).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
  if (!updated) throw new AppError('Habit not found', 404, 'HABIT_NOT_FOUND');
  return updated;
}

export async function deleteHabit(userId: string, id: string) {
  await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function logHabit(userId: string, id: string, input: { logDate: Date; count: number }) {
  const habit = await db.query.habits.findFirst({ where: and(eq(habits.id, id), eq(habits.userId, userId)) });
  if (!habit) throw new AppError('Habit not found', 404, 'HABIT_NOT_FOUND');

  const [created] = await db
    .insert(habitLogs)
    .values({ 
      habitId: id,
      logDate: input.logDate,
      count: input.count
    })
    .returning();
    
  // Reward XP
  const { addXP } = await import('../users/users.service.js');
  await addXP(userId, 5); // 5 XP for habit log
  
  return created;
}

export async function deleteHabitLog(userId: string, id: string, date: string) {
  const habit = await db.query.habits.findFirst({ where: and(eq(habits.id, id), eq(habits.userId, userId)) });
  if (!habit) throw new AppError('Habit not found', 404, 'HABIT_NOT_FOUND');
  await db.delete(habitLogs).where(and(eq(habitLogs.habitId, id), eq(habitLogs.logDate, new Date(date))));
}

export async function habitStats(userId: string, id: string) {
  const habit = await db.query.habits.findFirst({ where: and(eq(habits.id, id), eq(habits.userId, userId)) });
  if (!habit) throw new AppError('Habit not found', 404, 'HABIT_NOT_FOUND');
  const logs = await db.select().from(habitLogs).where(eq(habitLogs.habitId, id)).orderBy(desc(habitLogs.logDate));
  
  // Get all unique days with any count for heatmap/history
  const history = logs.reduce((acc, log) => {
    const day = dayjs(log.logDate).format('YYYY-MM-DD');
    acc[day] = (acc[day] || 0) + (log.count || 1);
    return acc;
  }, {} as Record<string, number>);

  return { 
    habitId: id, 
    currentStreak: calculateStreak(logs, habit.targetCount || 1), 
    totalLogs: logs.length,
    history,
    targetCount: habit.targetCount
  };
}
