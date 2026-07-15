import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './todos.controller.js';
import { createTodoSchema, idParamsSchema, listTodosQuerySchema, reorderTodosSchema, updateTodoSchema } from './todos.validators.js';

export const todosRoutes = Router();

todosRoutes.get('/', validate({ query: listTodosQuerySchema }), controller.listTodos);
todosRoutes.post('/', validate({ body: createTodoSchema }), controller.createTodo);
todosRoutes.patch('/reorder', validate({ body: reorderTodosSchema }), controller.reorderTodos);
todosRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateTodoSchema }), controller.updateTodo);
todosRoutes.patch('/:id/toggle', validate({ params: idParamsSchema }), controller.toggleTodo);
todosRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteTodo);
todosRoutes.post('/:id/subtasks', validate({ params: idParamsSchema, body: createTodoSchema }), controller.addSubtask);
