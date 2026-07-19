import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './admin.service.js';

export const getOverviewMetrics = asyncHandler(async (_req, res) => {
  const metrics = await service.getOverviewMetrics();
  res.json({ success: true, data: metrics });
});

export const getFeatureUsageMetrics = asyncHandler(async (_req, res) => {
  const metrics = await service.getFeatureUsageMetrics();
  res.json({ success: true, data: metrics });
});
