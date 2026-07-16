import dayjs from 'dayjs';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { expenses } from '../../db/schema/expenses.js';
import { habitLogs, habits } from '../../db/schema/habits.js';
import { journalEntries } from '../../db/schema/journal.js';
import { pomodoroSessions } from '../../db/schema/pomodoroSessions.js';
import { todos } from '../../db/schema/todos.js';

export async function getInsights(userId: string, days: number) {
  const rangeStart = dayjs().startOf('day').subtract(days - 1, 'day');
  const startDate = rangeStart.toDate();
  const endDate = dayjs().endOf('day').toDate();
  const startStr = rangeStart.format('YYYY-MM-DD');
  const endStr = dayjs().format('YYYY-MM-DD');

  const dateList: string[] = [];
  for (let i = 0; i < days; i += 1) {
    dateList.push(rangeStart.add(i, 'day').format('YYYY-MM-DD'));
  }

  const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
  const habitIds = userHabits.map(h => h.id);

  const [completedTodos, sessions, logs, journalRows, expenseRows] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), gte(todos.completedAt, startDate), lte(todos.completedAt, endDate))),
    db
      .select()
      .from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), gte(pomodoroSessions.createdAt, startDate), lte(pomodoroSessions.createdAt, endDate))),
    habitIds.length > 0
      ? db.select().from(habitLogs).where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.logDate, startDate), lte(habitLogs.logDate, endDate)))
      : Promise.resolve([]),
    db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), gte(journalEntries.entryDate, startStr), lte(journalEntries.entryDate, endStr))),
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, dayjs().startOf('day').subtract(29, 'day').toDate()))),
  ]);

  const tasksCompletedByDay = dateList.map(date => ({
    date,
    count: completedTodos.filter(t => t.completedAt && dayjs(t.completedAt).format('YYYY-MM-DD') === date).length,
  }));

  const focusMinutesByDay = dateList.map(date => ({
    date,
    minutes: Math.round(
      sessions.filter(s => dayjs(s.createdAt).format('YYYY-MM-DD') === date).reduce((sum, s) => sum + (s.duration || 0), 0) / 60
    ),
  }));

  const habitCompletionByDay = dateList.map(date => {
    let completed = 0;
    for (const habit of userHabits) {
      const dayCount = logs
        .filter(l => l.habitId === habit.id && dayjs(l.logDate).format('YYYY-MM-DD') === date)
        .reduce((sum, l) => sum + (l.count || 1), 0);
      if (dayCount >= (habit.targetCount || 1)) completed += 1;
    }
    return { date, completed, total: userHabits.length };
  });

  const moodByDay = dateList.map(date => {
    const entry = journalRows.find(j => j.entryDate === date);
    return { date, mood: entry?.mood ?? null };
  });

  const amountByCategory = new Map<string, number>();
  for (const row of expenseRows) {
    const category = row.category || 'other';
    amountByCategory.set(category, (amountByCategory.get(category) || 0) + Number(row.amount || 0));
  }
  const expensesByCategory = Array.from(amountByCategory.entries())
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const totals = {
    tasksCompleted: completedTodos.length,
    focusMinutes: Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
    habitCompletions: habitCompletionByDay.reduce((sum, d) => sum + d.completed, 0),
    journalEntries: journalRows.length,
  };

  return {
    days,
    tasksCompletedByDay,
    focusMinutesByDay,
    habitCompletionByDay,
    moodByDay,
    expensesByCategory,
    totals,
  };
}
