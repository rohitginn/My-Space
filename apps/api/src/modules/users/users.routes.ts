import { Router } from 'express';

import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './users.controller.js';
import { updateUserSchema } from './users.validators.js';

export const usersRoutes = Router();

usersRoutes.get('/me', controller.getMe);
usersRoutes.patch('/me', validate({ body: updateUserSchema }), controller.updateMe);
usersRoutes.delete('/me', controller.deleteMe);
usersRoutes.post('/me/avatar', upload.single('avatar'), controller.uploadAvatar);
