const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

const paymentIntentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many payment creation attempts from this IP, please try again after an hour',
});

module.exports = {
    generalLimiter,
    loginLimiter,
    paymentIntentLimiter,
};
