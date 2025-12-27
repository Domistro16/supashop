import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../controllers/notifications.controller';

const router = Router();

// All notification routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @query   limit - Number of notifications to fetch (default: 20)
 * @query   unreadOnly - If true, only fetch unread notifications
 * @access  Private
 */
router.get('/', getNotifications);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @body    all - If true, mark all notifications as read
 * @access  Private
 */
router.put('/:notificationId/read', markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', deleteNotification);

export default router;
