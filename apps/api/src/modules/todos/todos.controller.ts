import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as todosService from './todos.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listTodos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await todosService.listTodos(userId(req), req.query as never) });
});

export const createTodo = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await todosService.createTodo(userId(req), req.body) });
});

export const updateTodo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await todosService.updateTodo(userId(req), req.params.id, req.body) });
});

export const toggleTodo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await todosService.toggleTodo(userId(req), req.params.id) });
});

export const deleteTodo = asyncHandler(async (req, res) => {
  await todosService.deleteTodo(userId(req), req.params.id);
  res.status(204).send();
});

export const addSubtask = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await todosService.addSubtask(userId(req), req.params.id, req.body) });
});

export const reorderTodos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await todosService.reorderTodos(userId(req), req.body.items) });
});
