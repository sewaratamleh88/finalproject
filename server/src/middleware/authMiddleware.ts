import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface JwtUserPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
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
    const decoded = jwt.verify(token, secret) as JwtUserPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
