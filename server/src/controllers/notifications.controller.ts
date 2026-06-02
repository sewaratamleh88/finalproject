import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { NotificationModel } from '../models/Notification.model.js';

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const items = await NotificationModel.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function markNotificationsRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const { ids } = (req.body ?? {}) as { ids?: unknown };
    const idList = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [];
    const objectIds = idList
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const filter =
      objectIds.length > 0
        ? { userId: userObjectId, _id: { $in: objectIds } }
        : { userId: userObjectId };

    await NotificationModel.updateMany(filter, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

