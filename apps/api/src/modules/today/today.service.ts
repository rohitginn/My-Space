import dayjs from 'dayjs';
import { and, asc, eq, gte, lt, lte } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { calendarEvents } from '../../db/schema/calendar.js';
import { journalEntries } from '../../db/schema/journal.js';
import { pomodoroSessions } from '../../db/schema/pomodoroSessions.js';
import { todos } from '../../db/schema/todos.js';
import { users } from '../../db/schema/users.js';
import { listHabits } from '../habits/habits.service.js';

export async function getToday(userId: string) {
  const startOfToday = dayjs().startOf('day').toDate();
  const endOfToday = dayjs().endOf('day').toDate();
  const todayStr = dayjs().format('YYYY-MM-DD');

  const [tasksDue, tasksOverdue, completedToday, habits, events, focusSessions, journalEntry, user] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.isCompleted, false), gte(todos.dueDate, startOfToday), lte(todos.dueDate, endOfToday)))
      .orderBy(asc(todos.dueDate)),
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.isCompleted, false), lt(todos.dueDate, startOfToday)))
      .orderBy(asc(todos.dueDate))
      .limit(10),
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), gte(todos.completedAt, startOfToday), lte(todos.completedAt, endOfToday))),
    listHabits(userId),
    db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), lte(calendarEvents.startTime, endOfToday), gte(calendarEvents.endTime, startOfToday)))
      .orderBy(asc(calendarEvents.startTime)),
    db
      .select()
      .from(pomodoroSessions)
      .where(and(eq(pomodoroSessions.userId, userId), gte(pomodoroSessions.createdAt, startOfToday), lte(pomodoroSessions.createdAt, endOfToday))),
    db.query.journalEntries.findFirst({ where: and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, todayStr)) }),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);

  const focusSecondsToday = focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  return {
    date: todayStr,
    tasksDue,
    tasksOverdue,
    tasksCompletedToday: completedToday.length,
    habits,
    events,
    focus: { minutesToday: Math.round(focusSecondsToday / 60), sessionsToday: focusSessions.length },
    journal: { hasEntryToday: !!journalEntry, mood: journalEntry?.mood ?? null },
    user: { xp: user?.xp ?? 0, level: user?.level ?? 1, currentStreak: user?.currentStreak ?? 0 },
  };
}
