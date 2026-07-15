import type { NextFunction, Request, Response } from 'express';
import type { MulterError } from 'multer';
import { ZodError } from 'zod';

import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

type DatabaseError = Error & { code?: string };

export function errorHandler(err: DatabaseError | MulterError, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: err.issues },
    });
    return;
  }

  if (err.name === 'MulterError' && err.message.includes('File too large')) {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File size exceeded' },
    });
    return;
  }

  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ENTRY', message: 'Resource already exists' },
    });
    return;
  }

  logger.error({ err }, 'Unhandled request error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
