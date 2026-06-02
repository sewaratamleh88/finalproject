import { Router } from 'express';
import { listUsers } from '../controllers/users.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

export const usersRouter = Router();

usersRouter.get('/', authMiddleware, requireRole('admin'), listUsers);
