import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function authMiddleware(req, res, next) {
    const secret = env.JWT_SECRET.trim();
    if (!secret) {
        return res.status(500).json({ message: 'Server misconfiguration' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, secret);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}
