import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.model.js';
import { env } from '../config/env.js';
import { validateEmail, validatePassword } from '../utils/validation.js';
function getJwtSecret(res) {
    const secret = env.JWT_SECRET.trim();
    if (!secret) {
        res.status(500).json({ message: 'Server misconfiguration' });
        return null;
    }
    return secret;
}
function isDuplicateKeyError(err) {
    return (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        err.code === 11000);
}
export async function register(req, res, next) {
    try {
        const secret = getJwtSecret(res);
        if (!secret)
            return;
        const emailValidation = validateEmail(req.body?.email);
        if (emailValidation.error || !emailValidation.email) {
            return res.status(400).json({ message: emailValidation.error ?? 'Email is required' });
        }
        const passwordError = validatePassword(req.body?.password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }
        const password = req.body.password;
        const user = await UserModel.create({
            email: emailValidation.email,
            password,
            role: 'user',
        });
        const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    }
    catch (err) {
        if (isDuplicateKeyError(err)) {
            return res.status(409).json({ message: 'Email already registered' });
        }
        next(err);
    }
}
export async function login(req, res, next) {
    try {
        const secret = getJwtSecret(res);
        if (!secret)
            return;
        const emailValidation = validateEmail(req.body?.email);
        if (emailValidation.error || !emailValidation.email) {
            return res.status(400).json({ message: emailValidation.error ?? 'Email is required' });
        }
        const passwordError = validatePassword(req.body?.password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }
        const password = req.body.password;
        const user = await UserModel.findOne({ email: emailValidation.email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
        return res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    }
    catch (err) {
        if (res.headersSent)
            return next(err);
        return res.status(500).json({ message: 'Login failed' });
    }
}
