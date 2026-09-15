import { Router } from 'express';
import { googleLogin, demoLogin, getMe, logout } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public - Google OAuth login
router.post('/google', googleLogin);

// Public - Demo login for local testing / review
router.post('/demo', demoLogin);

// Protected - Get current user
router.get('/me', authMiddleware, getMe);

// Protected - Logout
router.post('/logout', authMiddleware, logout);

export default router;
