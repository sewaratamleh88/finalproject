import type { Request, Response, NextFunction } from 'express';
import { Meeting } from '../models/meeting.model.js';
import {
  LIMITS,
  isPastDateYmd,
  validateDateYmd,
  validateOptionalDateYmd,
  validateOptionalTimeHm,
  validateRequiredString,
} from '../utils/validation.js';

export async function createMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, date, time } = req.body ?? {};
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const titleError = validateRequiredString(title, 'Title', {
      min: 1,
      max: LIMITS.meetingTitle,
    });
    if (titleError) {
      return res.status(400).json({ message: titleError });
    }

    const dateError = validateDateYmd(date);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const timeError = validateOptionalTimeHm(time);
    if (timeError) {
      return res.status(400).json({ message: timeError });
    }

    const normalizedDate = (date as string).trim();
    if (isPastDateYmd(normalizedDate)) {
      return res.status(400).json({ message: 'Cannot create a meeting in the past' });
    }

    const meeting = await Meeting.create({
      title: (title as string).trim(),
      date: normalizedDate,
      time: typeof time === 'string' ? time.trim() : '',
      createdBy: req.user.id,
    });

    res.status(201).json(meeting);
  } catch (err) {
    next(err);
  }
}

export async function getMeetings(_req: Request, res: Response, next: NextFunction) {
  try {
    const meetings = await Meeting.find().sort({ createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    next(err);
  }
}

export async function updateMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { title, date, time } = req.body ?? {};
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (title !== undefined) {
      const titleError = validateRequiredString(title, 'Title', {
        min: 1,
        max: LIMITS.meetingTitle,
      });
      if (titleError) {
        return res.status(400).json({ message: titleError });
      }
    }

    const dateError = validateOptionalDateYmd(date);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const timeError = validateOptionalTimeHm(time);
    if (timeError) {
      return res.status(400).json({ message: timeError });
    }

    const existing = await Meeting.findById(id).lean();
    if (!existing) return res.status(404).json({ message: 'Meeting not found' });
    if (String(existing.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (isPastDateYmd(existing.date)) {
      return res.status(400).json({ message: 'Cannot edit past meetings' });
    }
    if (date !== undefined && isPastDateYmd((date as string).trim())) {
      return res.status(400).json({ message: 'Cannot create a meeting in the past' });
    }

    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = (title as string).trim();
    if (date !== undefined) patch.date = (date as string).trim();
    if (time !== undefined) patch.time = (time as string).trim();

    const updated = await Meeting.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Meeting not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await Meeting.findById(id).lean();
    if (!existing) return res.status(404).json({ message: 'Meeting not found' });
    if (String(existing.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Meeting.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
