import { Router } from 'express';
import { createTask, deleteTask, listTasks, updateTask, } from '../controllers/tasks.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
export const tasksRouter = Router();
tasksRouter.get('/', authMiddleware, listTasks);
tasksRouter.post('/', authMiddleware, createTask);
tasksRouter.put('/:id', authMiddleware, updateTask);
// keep the same route, but authorization is enforced inside the controller
tasksRouter.delete('/:id', authMiddleware, deleteTask);
