import { Response } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get notifications for the current user in the current shop
 */
export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.shopId) {
      return res.status(400).json({ error: 'Authentication and shop context required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        shopId: req.shopId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        shopId: req.shopId,
        isRead: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Mark notification(s) as read
 */
export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { notificationId } = req.params;
    const { all } = req.body;

    if (all) {
      // Mark all notifications as read for this user
      await prisma.notification.updateMany({
        where: {
          userId: req.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({ message: 'All notifications marked as read' });
    } else if (notificationId) {
      // Mark specific notification as read
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.userId !== req.user.id) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/**
 * Create a notification (used internally by services)
 */
export async function createNotification(
  shopId: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    return await prisma.notification.create({
      data: {
        shopId,
        userId,
        type,
        title,
        message,
        data,
      },
    });
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
}
