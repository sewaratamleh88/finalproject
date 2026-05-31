const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HM_RE = /^\d{2}:\d{2}$/;
export const LIMITS = {
    email: 254,
    passwordMin: 6,
    passwordMax: 128,
    taskTitle: 200,
    taskDescription: 2000,
    taskComment: 1000,
    meetingTitle: 200,
};
const TASK_PRIORITIES = ['low', 'medium', 'high'];
export function parseDateYmd(dateStr) {
    if (!DATE_YMD_RE.test(dateStr))
        return null;
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
export function isPastDateYmd(dateStr) {
    const day = parseDateYmd(dateStr);
    if (!day)
        return false;
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return day < todayUtc;
}
export function validateRequiredString(value, fieldLabel, opts = {}) {
    if (value === undefined || value === null) {
        return `${fieldLabel} is required`;
    }
    if (typeof value !== 'string') {
        return `${fieldLabel} must be a string`;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return `${fieldLabel} cannot be empty`;
    }
    const min = opts.min ?? 1;
    const max = opts.max ?? 500;
    if (trimmed.length < min) {
        return `${fieldLabel} must be at least ${min} characters`;
    }
    if (trimmed.length > max) {
        return `${fieldLabel} is too long`;
    }
    return null;
}
export function validateOptionalString(value, fieldLabel, opts = {}) {
    if (value === undefined)
        return { error: null, value: undefined };
    if (value === null)
        return { error: `${fieldLabel} must be a string`, value: undefined };
    if (typeof value !== 'string')
        return { error: `${fieldLabel} must be a string`, value: undefined };
    const trimmed = value.trim();
    const max = opts.max ?? LIMITS.taskDescription;
    if (trimmed.length > max) {
        return { error: `${fieldLabel} is too long`, value: undefined };
    }
    return { error: null, value: trimmed };
}
export function validateEmail(value) {
    const requiredError = validateRequiredString(value, 'Email', { min: 3, max: LIMITS.email });
    if (requiredError)
        return { error: requiredError, email: null };
    const email = value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
        return { error: 'Email format is invalid', email: null };
    }
    return { error: null, email };
}
export function validatePassword(value) {
    if (value === undefined || value === null) {
        return 'Password is required';
    }
    if (typeof value !== 'string') {
        return 'Password must be a string';
    }
    if (!value.trim()) {
        return 'Password cannot be empty';
    }
    if (value.length < LIMITS.passwordMin) {
        return `Password must be at least ${LIMITS.passwordMin} characters`;
    }
    if (value.length > LIMITS.passwordMax) {
        return 'Password is too long';
    }
    return null;
}
export function validateTaskPriority(value) {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== 'string')
        return 'Priority must be a string';
    if (!TASK_PRIORITIES.includes(value)) {
        return 'Priority must be low, medium, or high';
    }
    return null;
}
export function validateDateYmd(value, fieldLabel = 'Date') {
    if (value === undefined || value === null) {
        return `${fieldLabel} is required`;
    }
    if (typeof value !== 'string') {
        return `${fieldLabel} must be a string`;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return `${fieldLabel} cannot be empty`;
    }
    if (!parseDateYmd(trimmed)) {
        return `${fieldLabel} must be in YYYY-MM-DD format`;
    }
    return null;
}
export function validateOptionalDateYmd(value, fieldLabel = 'Date') {
    if (value === undefined)
        return null;
    if (value === null)
        return `${fieldLabel} must be a string`;
    if (typeof value !== 'string')
        return `${fieldLabel} must be a string`;
    const trimmed = value.trim();
    if (!trimmed)
        return `${fieldLabel} cannot be empty`;
    if (!parseDateYmd(trimmed)) {
        return `${fieldLabel} must be in YYYY-MM-DD format`;
    }
    return null;
}
export function validateOptionalTimeHm(value) {
    if (value === undefined)
        return null;
    if (value === null)
        return 'Time must be a string';
    if (typeof value !== 'string')
        return 'Time must be a string';
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (!TIME_HM_RE.test(trimmed)) {
        return 'Time must be in HH:MM format';
    }
    return null;
}
