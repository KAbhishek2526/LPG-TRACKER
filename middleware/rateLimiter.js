const rateLimit = require('express-rate-limit');

// Protect login endpoint from brute force attacks
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per window
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

// Protect OTP request/submission endpoints from brute force
exports.otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // Limit each IP to 3 OTP attempts
    message: { error: 'Too many OTP attempts, please try again after 10 minutes' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

// Protect delivery endpoint against spam
exports.deliveryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 2, // Max 2 deliveries per minute per IP to block robotic mass scanning
    message: { error: 'Slow down. Too many delivery events registered at once.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});
