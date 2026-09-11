import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  scheduleEmail,
  getScheduled,
  getSent,
  getEmail,
  cancelEmail,
  getStats,
  getSenders,
} from '../controllers/emailController';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

// Schedule new emails
router.post('/schedule', scheduleEmail);

// Get scheduled emails (paginated)
router.get('/scheduled', getScheduled);

// Get sent/failed emails (paginated)
router.get('/sent', getSent);

// Get email stats (counts by status)
router.get('/stats', getStats);

// Get user's senders
router.get('/senders', getSenders);

// Get single email by ID
router.get('/:id', getEmail);

// Cancel a scheduled email
router.post('/:id/cancel', cancelEmail);

export default router;
