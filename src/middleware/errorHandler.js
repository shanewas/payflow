const handleStripeError = (err) => {
    switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            return {
                statusCode: 402,
                message: err.message,
                error: 'CardError',
            };
        case 'StripeRateLimitError':
            // Too many requests made to the API too quickly
            return {
                statusCode: 429,
                message: 'Too many requests. Please try again later.',
                error: 'RateLimitError',
            };
        case 'StripeInvalidRequestError':
            // Invalid parameters were supplied to Stripe's API
            return {
                statusCode: 400,
                message: err.message,
                error: 'InvalidRequestError',
            };
        case 'StripeAPIError':
            // An error occurred internally with Stripe's API
            return {
                statusCode: 500,
                message: 'Stripe API error. Please try again later.',
                error: 'StripeAPIError',
            };
        case 'StripeConnectionError':
            // Some kind of error connecting to Stripe
            return {
                statusCode: 500,
                message: 'Could not connect to Stripe. Please check your network connection.',
                error: 'StripeConnectionError',
            };
        case 'StripeAuthenticationError':
            // You probably used an incorrect API key
            return {
                statusCode: 401,
                message: 'Authentication with Stripe failed.',
                error: 'StripeAuthenticationError',
            };
        default:
            // Handle other types of Stripe errors
            return {
                statusCode: 500,
                message: 'An unexpected Stripe error occurred.',
                error: 'StripeError',
            };
    }
};

const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.type && err.type.startsWith('Stripe')) {
        const { statusCode, message, error } = handleStripeError(err);
        return res.status(statusCode).json({ error, message, statusCode });
    }
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred.';
    const error = err.name || 'InternalServerError';

    res.status(statusCode).json({
        error,
        message,
        statusCode,
    });
};

module.exports = errorHandler;
