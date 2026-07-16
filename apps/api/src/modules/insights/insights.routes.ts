import { Router } from 'express';

import * as controller from './insights.controller.js';

export const insightsRoutes = Router();

insightsRoutes.get('/', controller.getInsights);
