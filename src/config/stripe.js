require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27', // Use a specific API version for consistency
    typescript: false,
});

const isStripeError = (error) => {
    return error.type && error.type.startsWith('Stripe');
};

const classifyStripeError = (error) => {
    if (!isStripeError(error)) {
        return {
            type: 'Unknown',
            message: 'An unexpected error occurred.',
        };
    }
    return {
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
    };
};

module.exports = {
    stripe,
    isStripeError,
    classifyStripeError,
};
