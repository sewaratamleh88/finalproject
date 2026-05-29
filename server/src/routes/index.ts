import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { tasksRouter } from './tasks.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/tasks', tasksRouter);

// Later stages: /ai

