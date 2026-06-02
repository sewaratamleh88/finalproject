import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User.model.js';

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await UserModel.find()
      .select('_id email role')
      .sort({ email: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
}
