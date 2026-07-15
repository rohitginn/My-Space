import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './calendar.controller.js';
import { eventSchema, idParamsSchema, listEventsQuerySchema, updateEventSchema } from './calendar.validators.js';

export const calendarRoutes = Router();

calendarRoutes.get('/events', validate({ query: listEventsQuerySchema }), controller.listEvents);
calendarRoutes.post('/events', validate({ body: eventSchema }), controller.createEvent);
calendarRoutes.patch('/events/:id', validate({ params: idParamsSchema, body: updateEventSchema }), controller.updateEvent);
calendarRoutes.delete('/events/:id', validate({ params: idParamsSchema }), controller.deleteEvent);
