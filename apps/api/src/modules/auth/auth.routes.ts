import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './auth.controller.js';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.validators.js';

export const authRoutes = Router();

authRoutes.post('/register', validate({ body: registerSchema }), controller.register);
authRoutes.post('/login', validate({ body: loginSchema }), controller.login);
authRoutes.post('/refresh', controller.refresh);
authRoutes.post('/logout', authenticate, controller.logout);
authRoutes.get('/me', authenticate, controller.me);
authRoutes.post('/forgot-password', validate({ body: forgotPasswordSchema }), controller.forgotPassword);
authRoutes.post('/reset-password', validate({ body: resetPasswordSchema }), controller.resetPassword);
authRoutes.patch('/change-password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);
