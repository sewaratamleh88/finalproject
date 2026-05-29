import { Schema, model, type InferSchemaType } from 'mongoose';

const meetingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    time: {
      type: String,
      required: false,
      trim: true,
      match: /^$|^\d{2}:\d{2}$/,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

export type Meeting = InferSchemaType<typeof meetingSchema>;
export const Meeting = model('Meeting', meetingSchema);

