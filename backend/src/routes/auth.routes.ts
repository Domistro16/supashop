import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/signup', authController.signUp);
router.post('/signin', authController.signIn);

// Protected routes
router.get('/me', authenticate, authController.getMe);

export default router;
