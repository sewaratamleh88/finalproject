import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Meeting } from '../models/meeting.model.js';
import { NotificationModel } from '../models/Notification.model.js';
import { UserModel } from '../models/User.model.js';
import {
  LIMITS,
  isPastDateYmd,
  validateDateYmd,
  validateOptionalDateYmd,
  validateOptionalTimeHm,
  validateRequiredString,
} from '../utils/validation.js';

function parseParticipantIds(value: unknown): mongoose.Types.ObjectId[] {
  if (!Array.isArray(value)) return [];
  const ids: mongoose.Types.ObjectId[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !mongoose.Types.ObjectId.isValid(item)) continue;
    ids.push(new mongoose.Types.ObjectId(item));
  }
  return ids;
}

export async function createMeeting(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, date, time, participants, isAllUsers } = req.body ?? {};
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const isAdmin = req.user.role === 'admin';
    const inviteAll = isAdmin && isAllUsers === true;
    const invitees = isAdmin && !inviteAll ? parseParticipantIds(participants) : [];

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
      userId: req.user.id,
      createdBy: req.user.id,
      participants: invitees,
      isAllUsers: inviteAll,
    });

    if (inviteAll) {
      const allUsers = await UserModel.find({}).select('_id').lean();
      const docs = allUsers
        .map((u) => String((u as { _id?: unknown })._id))
        .filter((id) => id && id !== String(req.user?.id))
        .map((id) => ({
          userId: new mongoose.Types.ObjectId(id),
          type: 'meeting_invite' as const,
          message: 'You were invited to a meeting',
          meetingId: meeting._id,
          read: false,
        }));
      if (docs.length > 0) {
        await NotificationModel.insertMany(docs);
      }
    } else if (invitees.length > 0) {
      const docs = invitees.map((id) => ({
        userId: id,
        type: 'meeting_invite' as const,
        message: 'You were invited to a meeting',
        meetingId: meeting._id,
        read: false,
      }));
      await NotificationModel.insertMany(docs);
    }

    console.log('MEETING CREATED:', {
      id: meeting._id,
      isAllUsers: meeting.isAllUsers,
      participants: meeting.participants,
    });

    await meeting.populate([
      { path: 'participants', select: 'email' },
      { path: 'createdBy', select: 'email' },
      { path: 'userId', select: 'email' },
    ]);

    const io = req.app.get('io');
    if (io) {
      const payload = typeof (meeting as unknown as { toObject?: unknown }).toObject === 'function'
        ? (meeting as unknown as { toObject: () => unknown }).toObject()
        : meeting;

      if (meeting.isAllUsers === true) {
        console.log('EMITTING TO ALL USERS');
        io.emit('meeting_invited', payload);
      } else {
        // NOTE: meeting.participants may be populated docs, so emit using the actual _id.
        const participantRoomIds = (meeting.participants ?? [])
          .map((p: unknown) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object' && '_id' in p) {
              console.log('PARTICIPANT OBJECT:', p);
              const id = (p as { _id?: unknown })._id;
              return id ? String(id) : null;
            }
            return p ? String(p) : null;
          })
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

        if (participantRoomIds.length === 0) {
          console.log('MEETING INVITE WARNING: no participants to emit to');
        }

        for (const roomId of participantRoomIds) {
          console.log('EMITTING TO ROOM:', roomId, typeof roomId);
          io.to(roomId).emit('meeting_invited', payload);
        }
      }
    }

    res.status(201).json(meeting.toObject());
  } catch (err) {
    next(err);
  }
}

export async function getMeetings(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const meetings = await Meeting.find({
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false }, createdBy: userObjectId },
        { participants: userObjectId },
        { isAllUsers: true },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('participants', 'email')
      .populate('createdBy', 'email')
      .populate('userId', 'email');
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
    const ownerId = existing.userId ?? existing.createdBy;
    if (!ownerId || String(ownerId) !== String(req.user.id)) {
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
    await updated.populate([
      { path: 'participants', select: 'email' },
      { path: 'createdBy', select: 'email' },
      { path: 'userId', select: 'email' },
    ]);
    res.json(updated.toObject());
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
    const ownerId = existing.userId ?? existing.createdBy;
    if (!ownerId || String(ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Meeting.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
