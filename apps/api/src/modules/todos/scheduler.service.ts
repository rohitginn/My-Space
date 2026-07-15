import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import dayjs from 'dayjs';

import { db } from '../../config/db.js';
import { todos } from '../../db/schema/todos.js';
import { calendarEvents } from '../../db/schema/calendar.js';

type TimeSlot = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export async function autoScheduleTasks(userId: string) {
  // 1. Fetch uncompleted tasks with a duration that need scheduling
  const tasksToSchedule = await db.query.todos.findMany({
    where: and(
      eq(todos.userId, userId),
      eq(todos.isCompleted, false)
    ),
  });

  const validTasks = tasksToSchedule
    .filter((t) => t.durationMinutes && t.durationMinutes > 0)
    .sort((a, b) => {
      // Sort by priority then due date
      const pmap: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const pa = pmap[a.priority || 'medium'] || 2;
      const pb = pmap[b.priority || 'medium'] || 2;
      if (pa !== pb) return pb - pa;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  if (validTasks.length === 0) return { scheduled: 0 };

  // 2. Fetch calendar events for the next 7 days
  const now = dayjs();
  const nextWeek = now.add(7, 'day');
  
  const events = await db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.startTime, now.toDate()),
      lte(calendarEvents.endTime, nextWeek.toDate())
    ),
  });

  const blockedSlots: TimeSlot[] = events.map((e) => ({
    start: dayjs(e.startTime),
    end: dayjs(e.endTime),
  }));

  let scheduledCount = 0;
  
  // 3. Simple scheduler logic (Working hours 9 AM to 5 PM, Mon-Fri)
  let currentCursor = now.minute(Math.ceil(now.minute() / 15) * 15).second(0).millisecond(0);
  
  for (const task of validTasks) {
    let scheduled = false;
    let attempts = 0;
    let taskStart = currentCursor;

    while (!scheduled && attempts < 100) { // Limit to 100 slots to prevent infinite loop
      // Jump to next working hour if outside 9-5 or on weekend
      if (taskStart.hour() >= 17) {
        taskStart = taskStart.add(1, 'day').hour(9).minute(0);
      }
      if (taskStart.hour() < 9) {
        taskStart = taskStart.hour(9).minute(0);
      }
      if (taskStart.day() === 0 || taskStart.day() === 6) { // Weekend
        taskStart = taskStart.add(taskStart.day() === 6 ? 2 : 1, 'day').hour(9).minute(0);
      }

      const taskEnd = taskStart.add(task.durationMinutes!, 'minute');
      
      // If task extends past 5 PM, move to next day
      if (taskEnd.hour() > 17 || (taskEnd.hour() === 17 && taskEnd.minute() > 0)) {
        taskStart = taskStart.add(1, 'day').hour(9).minute(0);
        attempts++;
        continue;
      }

      // Check against blocked slots
      const hasOverlap = blockedSlots.some(
        (slot) => (taskStart.isBefore(slot.end) && taskEnd.isAfter(slot.start))
      );

      if (hasOverlap) {
        taskStart = taskStart.add(15, 'minute'); // Move by 15 mins
        attempts++;
      } else {
        // Found a slot!
        await db.update(todos)
          .set({
            scheduledStart: taskStart.toDate(),
            scheduledEnd: taskEnd.toDate(),
            updatedAt: new Date()
          })
          .where(eq(todos.id, task.id));
          
        blockedSlots.push({ start: taskStart, end: taskEnd });
        scheduledCount++;
        scheduled = true;
        
        // Move cursor for next task
        currentCursor = taskEnd;
      }
    }
  }

  return { scheduled: scheduledCount };
}
