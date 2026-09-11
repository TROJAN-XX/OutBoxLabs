import { Router } from 'express';
import { googleLogin, getMe, logout } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public - Google OAuth login
router.post('/google', googleLogin);

// Protected - Get current user
router.get('/me', authMiddleware, getMe);

// Protected - Logout
router.post('/logout', authMiddleware, logout);

export default router;
