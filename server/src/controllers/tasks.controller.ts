import type { NextFunction, Request, Response } from 'express';
import { TaskModel } from '../models/Task.model.js';

const TASK_STATUSES = ['todo', 'in_progress', 'done', 'approved', 'rejected'] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (TASK_STATUSES as readonly string[]).includes(v);
}

function completedFromStatus(status: TaskStatus) {
  return status === 'done' || status === 'approved';
}

function normalizeTaskDoc<T extends { completed?: boolean; status?: string }>(t: T) {
  let status: TaskStatus = isTaskStatus(t.status) ? t.status : t.completed ? 'done' : 'todo';
  // Simplification: treat legacy 'in_progress' as 'todo' in the workflow.
  if (status === 'in_progress') status = 'todo';
  const completed = completedFromStatus(status);
  return { ...t, status, completed };
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // USER: only own tasks. ADMIN: only tasks ready for review (done).
    const doneFilter = {
      $or: [{ status: 'done' }, { status: { $exists: false }, completed: true }],
    };

    const qUserId = req.query?.userId;
    const adminUserId = typeof qUserId === 'string' && qUserId.trim() ? qUserId.trim() : null;

    const filter =
      user.role === 'admin'
        ? adminUserId
          ? { $and: [doneFilter, { userId: adminUserId }] }
          : doneFilter
        : { userId: user.id };

    const query = TaskModel.find(filter).sort({ createdAt: -1 });
    const tasks =
      user.role === 'admin'
        ? await query.populate('userId', 'email role').lean()
        : await query.lean();
    res.json(tasks.map((t) => normalizeTaskDoc(t)));
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { title, description, priority } = req.body ?? {};
    const resolvedStatus: TaskStatus = 'todo';
    const resolvedCompleted = completedFromStatus(resolvedStatus);
    const created = await TaskModel.create({
      userId: user.id,
      title,
      description,
      priority,
      status: resolvedStatus,
      completed: resolvedCompleted,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const { title, description, priority, completed, status, comment } = req.body ?? {};

    const existing = await TaskModel.findById(id).lean();
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    if (user.role !== 'admin') {
      const ownerId = (existing as { userId?: unknown }).userId;
      if (!ownerId || String(ownerId) !== String(user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const patch: Record<string, unknown> = {};
    if (user.role === 'admin') {
      // Admin review flow: can only set status to approved/rejected, and only for tasks that are done.
      if (status === undefined || !isTaskStatus(status) || (status !== 'approved' && status !== 'rejected')) {
        return res.status(400).json({ message: 'Admin can only set status to approved/rejected' });
      }

      const currentStatus = normalizeTaskDoc(existing).status;
      if (currentStatus !== 'done') {
        return res.status(403).json({ message: 'Only done tasks can be reviewed' });
      }

      patch.status = status;
      patch.completed = completedFromStatus(status);
      if (comment !== undefined) {
        patch.comment = typeof comment === 'string' ? comment.trim() : '';
      }
    } else {
      // User flow: can update own task fields; approval statuses are not allowed.
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (priority !== undefined) patch.priority = priority;

      if (status !== undefined) {
        // User can move rejected -> todo to fix and resubmit, and can set done.
        if (!isTaskStatus(status) || status === 'approved') {
          return res.status(403).json({ message: 'Forbidden' });
        }
        const currentStatus = normalizeTaskDoc(existing).status;
        if (currentStatus === 'rejected') {
          if (status !== 'todo') return res.status(403).json({ message: 'Forbidden' });
        } else {
          if (status === 'rejected') return res.status(403).json({ message: 'Forbidden' });
          if (status === 'in_progress') return res.status(403).json({ message: 'Forbidden' });
        }

        patch.status = status;
        patch.completed = completedFromStatus(status);
      } else if (completed !== undefined) {
        const nextStatus: TaskStatus = completed ? 'done' : 'todo';
        patch.completed = completed;
        patch.status = nextStatus;
      }
    }

    const updated = await TaskModel.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json(normalizeTaskDoc(updated.toObject()));
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const existing = await TaskModel.findById(id).lean();
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    const ownerId = (existing as { userId?: unknown }).userId;
    if (!ownerId || String(ownerId) !== String(user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const currentStatus = normalizeTaskDoc(existing).status;
    if (currentStatus !== 'approved') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await TaskModel.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

