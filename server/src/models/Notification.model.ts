import { Schema, model, type InferSchemaType } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['meeting_invite'], required: true },
    message: { type: String, required: true, trim: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: false },
    read: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
);

export type Notification = InferSchemaType<typeof NotificationSchema>;
export const NotificationModel = model('Notification', NotificationSchema);

