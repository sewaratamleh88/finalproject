import { Meeting } from '../models/meeting.model.js';
function toUtcDayStart(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m)
        return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
        return null;
    return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
}
function isPastDate(dateStr) {
    const day = toUtcDayStart(dateStr);
    if (!day)
        return false;
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return day < todayUtc;
}
export async function createMeeting(req, res, next) {
    try {
        const { title, date, time } = req.body ?? {};
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (typeof title !== 'string' || typeof date !== 'string') {
            return res.status(400).json({ message: 'Invalid body' });
        }
        if (time !== undefined && typeof time !== 'string') {
            return res.status(400).json({ message: 'Invalid body' });
        }
        if (isPastDate(date)) {
            return res.status(400).json({ message: 'Cannot create a meeting in the past' });
        }
        const meeting = await Meeting.create({
            title,
            date,
            time: typeof time === 'string' ? time.trim() : '',
            createdBy: req.user.id,
        });
        res.status(201).json(meeting);
    }
    catch (err) {
        next(err);
    }
}
export async function getMeetings(_req, res, next) {
    try {
        const meetings = await Meeting.find().sort({ createdAt: -1 });
        res.json(meetings);
    }
    catch (err) {
        next(err);
    }
}
export async function updateMeeting(req, res, next) {
    try {
        const { id } = req.params;
        const { title, date, time } = req.body ?? {};
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (title !== undefined && typeof title !== 'string') {
            return res.status(400).json({ message: 'Invalid body' });
        }
        if (date !== undefined && typeof date !== 'string') {
            return res.status(400).json({ message: 'Invalid body' });
        }
        if (time !== undefined && typeof time !== 'string') {
            return res.status(400).json({ message: 'Invalid body' });
        }
        const existing = await Meeting.findById(id).lean();
        if (!existing)
            return res.status(404).json({ message: 'Meeting not found' });
        if (String(existing.createdBy) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (isPastDate(existing.date)) {
            return res.status(400).json({ message: 'Cannot edit past meetings' });
        }
        if (date !== undefined && isPastDate(date)) {
            return res.status(400).json({ message: 'Cannot create a meeting in the past' });
        }
        const patch = {};
        if (title !== undefined)
            patch.title = title;
        if (date !== undefined)
            patch.date = date;
        if (time !== undefined)
            patch.time = time.trim();
        const updated = await Meeting.findByIdAndUpdate(id, patch, {
            new: true,
            runValidators: true,
        });
        if (!updated)
            return res.status(404).json({ message: 'Meeting not found' });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
