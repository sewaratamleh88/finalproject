import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
const SALT_ROUNDS = 10;
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true,
    },
}, { timestamps: true });
UserSchema.pre('save', async function () {
    if (!this.isModified('password'))
        return;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});
export const UserModel = model('User', UserSchema);
