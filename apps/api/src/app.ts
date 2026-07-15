import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';

import { env } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { expensesRoutes } from './modules/expenses/expenses.routes.js';
import { goalsRoutes } from './modules/goals/goals.routes.js';
import { habitsRoutes } from './modules/habits/habits.routes.js';
import { kanbanRoutes } from './modules/kanban/kanban.routes.js';
import { foldersRoutes } from './modules/notes/folders.routes.js';
import { notesRoutes } from './modules/notes/notes.routes.js';
import { pomodoroRoutes } from './modules/pomodoro/pomodoro.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { todosRoutes } from './modules/todos/todos.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());
  app.use(hpp());
  app.use(requestLogger);
  app.use(rateLimiter.global);
  app.use('/api/auth', rateLimiter.auth, authRoutes);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', environment: env.NODE_ENV, timestamp: new Date().toISOString() },
    });
  });

  app.use('/api/users', authenticate, usersRoutes);
  app.use('/api/notes', authenticate, notesRoutes);
  app.use('/api/folders', authenticate, foldersRoutes);
  app.use('/api/todos', authenticate, todosRoutes);
  app.use('/api/kanban', authenticate, kanbanRoutes);
  app.use('/api/calendar', authenticate, calendarRoutes);
  app.use('/api/habits', authenticate, habitsRoutes);
  app.use('/api/goals', authenticate, goalsRoutes);
  app.use('/api/expenses', authenticate, expensesRoutes);
  app.use('/api/pomodoro', authenticate, pomodoroRoutes);
  app.use('/api/search', authenticate, searchRoutes);

  app.all('*', (_req, res) => {
    res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);

  return app;
}
