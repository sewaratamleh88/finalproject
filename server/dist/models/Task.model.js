import { Schema, model } from 'mongoose';
const TaskSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        required: true,
    },
    status: {
        type: String,
        // keep 'in_progress' for backward compatibility with existing docs,
        // but the app workflow uses only: todo, done, approved, rejected
        enum: ['todo', 'in_progress', 'done', 'approved', 'rejected'],
        default: 'todo',
    },
    completed: { type: Boolean, default: false, required: true },
    comment: { type: String, trim: true, default: '' },
}, { timestamps: true });
export const TaskModel = model('Task', TaskSchema);
