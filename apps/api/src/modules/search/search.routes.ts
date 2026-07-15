import { Router } from 'express';

import * as controller from './search.controller.js';

export const searchRoutes = Router();

searchRoutes.get('/', controller.search);
