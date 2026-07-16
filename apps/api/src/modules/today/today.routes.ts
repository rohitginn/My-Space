import { Router } from 'express';

import * as controller from './today.controller.js';

export const todayRoutes = Router();

todayRoutes.get('/', controller.getToday);
