import { Router } from 'express';
import { listNotifications, markNotificationsRead } from '../controllers/notifications.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', authMiddleware, listNotifications);
notificationsRouter.patch('/mark-read', authMiddleware, markNotificationsRead);

