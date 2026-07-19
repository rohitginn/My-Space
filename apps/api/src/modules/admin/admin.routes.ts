import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './admin.controller.js';

const router = Router();

// Protect all admin routes with authentication and role-based authorization
router.use(authenticate, authorize(['admin']));

router.get('/metrics/overview', controller.getOverviewMetrics);
router.get('/metrics/features', controller.getFeatureUsageMetrics);

export const adminRoutes = router;
