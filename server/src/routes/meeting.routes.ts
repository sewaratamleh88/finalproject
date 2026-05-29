import { Router } from 'express';
import { createMeeting, getMeetings, updateMeeting } from '../controllers/meeting.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const meetingRoutes = Router();

meetingRoutes.post('/', authMiddleware, createMeeting);
meetingRoutes.get('/', authMiddleware, getMeetings);
meetingRoutes.put('/:id', authMiddleware, updateMeeting);

