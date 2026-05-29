import { Router } from 'express';
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '../controllers/tasks.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

export const tasksRouter = Router();

tasksRouter.get('/', authMiddleware, listTasks);
tasksRouter.post('/', authMiddleware, createTask);
tasksRouter.put('/:id', authMiddleware, updateTask);
// keep the same route, but authorization is enforced inside the controller
tasksRouter.delete('/:id', authMiddleware, deleteTask);

