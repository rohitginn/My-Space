import fs from 'node:fs';
import path from 'node:path';

import multer from 'multer';
import { nanoid } from 'nanoid';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${nanoid(8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('File type not allowed', 400, 'INVALID_FILE_TYPE'));
  },
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});
