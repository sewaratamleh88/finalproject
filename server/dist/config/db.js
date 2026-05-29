import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDB() {
    const uri = env.MONGO_URI;
    if (!uri) {
        throw new Error('Missing env var: MONGO_URI');
    }
    try {
        await mongoose.connect(uri);
        // eslint-disable-next-line no-console
        console.log('MongoDB connected');
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('MongoDB connection error:', err);
        throw err;
    }
}
