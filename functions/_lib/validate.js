// ===================================================
// Server-side validation — the authoritative checks.
// (validation.js on the client is just a UX layer; this is what
// actually gets enforced, since client-side checks can be bypassed.)
// ===================================================

export function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}

export function isNonEmptyString(value, maxLength = 200) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function isValidPhone(phone) {
    if (typeof phone !== 'string') return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

export function isValidDate(dateStr) {
    if (typeof dateStr !== 'string') return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}
