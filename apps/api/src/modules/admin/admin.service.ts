import { count, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { habits } from '../../db/schema/habits.js';
import { routines } from '../../db/schema/routines.js';
import { todos } from '../../db/schema/todos.js';
import { notes } from '../../db/schema/notes.js';
import { drawings } from '../../db/schema/drawings.js';
import { kanbanCards } from '../../db/schema/kanban.js';
import { journalEntries } from '../../db/schema/journal.js';
import { pomodoroSessions } from '../../db/schema/pomodoroSessions.js';

export async function getOverviewMetrics() {
  const [totalUsers] = await db.select({ count: count() }).from(users);
  
  // Calculate DAU (last 24 hours active users based on lastLoginAt)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [activeUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.lastLoginAt, twentyFourHoursAgo));

  const [habitsCount] = await db.select({ count: count() }).from(habits);
  const [todosCount] = await db.select({ count: count() }).from(todos);
  const [notesCount] = await db.select({ count: count() }).from(notes);
  const [drawingsCount] = await db.select({ count: count() }).from(drawings);
  
  const totalContent = habitsCount.count + todosCount.count + notesCount.count + drawingsCount.count;

  return {
    totalUsers: totalUsers.count,
    activeUsers: activeUsers.count,
    engagementRate: totalUsers.count > 0 ? (activeUsers.count / totalUsers.count) * 100 : 0,
    totalContent,
  };
}

export async function getFeatureUsageMetrics() {
  const [habitsCount] = await db.select({ count: count() }).from(habits);
  const [routinesCount] = await db.select({ count: count() }).from(routines);
  const [todosCount] = await db.select({ count: count() }).from(todos);
  const [notesCount] = await db.select({ count: count() }).from(notes);
  const [drawingsCount] = await db.select({ count: count() }).from(drawings);
  const [kanbanCardsCount] = await db.select({ count: count() }).from(kanbanCards);
  const [journalCount] = await db.select({ count: count() }).from(journalEntries);
  const [pomodoroCount] = await db.select({ count: count() }).from(pomodoroSessions);

  return {
    habits: habitsCount.count,
    routines: routinesCount.count,
    todos: todosCount.count,
    notes: notesCount.count,
    drawings: drawingsCount.count,
    kanban: kanbanCardsCount.count,
    journal: journalCount.count,
    pomodoro: pomodoroCount.count,
  };
}
