const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * A helper function to classify Stripe errors.
 * @param {Error} error The error object from a Stripe API call.
 * @returns {string} A string representing the type of error.
 */
function classifyStripeError(error) {
  if (!error.type) {
    return 'generic_error';
  }

  switch (error.type) {
    case 'StripeCardError':
      // A declined card error
      return 'card_error';
    case 'StripeRateLimitError':
      // Too many requests made to the API too quickly
      return 'rate_limit_error';
    case 'StripeInvalidRequestError':
      // Invalid parameters were supplied to Stripe's API
      return 'invalid_request_error';
    case 'StripeAPIError':
      // An error occurred internally with Stripe's API
      return 'api_error';
    case 'StripeConnectionError':
      // Some kind of error occurred during the HTTPS communication
      return 'connection_error';
    case 'StripeAuthenticationError':
      // You probably used an incorrect API key
      return 'authentication_error';
    default:
      // Handle other types of unexpected errors
      return 'unknown_error';
  }
}

module.exports = {
  stripe,
  classifyStripeError,
};
