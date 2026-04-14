const rateLimit = require('express-rate-limit');

const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

// Exporting standard names to maintain route compatibility without crashes
module.exports = {
    loginLimiter: standardLimiter,
    otpLimiter: standardLimiter,
    deliveryLimiter: standardLimiter,
    limiter: standardLimiter
};
