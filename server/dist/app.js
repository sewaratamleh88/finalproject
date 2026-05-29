import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { meetingRoutes } from './routes/meeting.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
export function createApp() {
    const app = express();
    app.use(cors({
        origin: env.CLIENT_ORIGIN,
        credentials: true,
    }));
    app.use(express.json());
    app.get('/', (_req, res) => {
        res.type('text').send('TEAM FLOW API is running. Try GET /health');
    });
    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });
    app.use('/api/meetings', meetingRoutes);
    app.use('/api', apiRouter);
    app.use(errorHandler);
    return app;
}
