const errorHandler = (err, req, res, next) => {
    console.error(err);
  
    // Default error response
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let error = 'ServerError';
  
    // Handle specific error types (e.g., from Stripe)
    if (err.type === 'StripeCardError') {
      statusCode = 400;
      error = 'StripeCardError';
      message = err.message;
    } else if (err.type === 'StripeInvalidRequestError') {
      statusCode = 400;
      error = 'StripeInvalidRequestError';
      message = 'Invalid parameters were supplied to Stripe\'s API';
    } else if (err.type) {
      // Handle other Stripe errors
      statusCode = err.statusCode || 500;
      error = err.type;
      message = err.message;
    }
  
    res.status(statusCode).json({
      error,
      message,
      statusCode,
    });
  };
  
  module.exports = errorHandler;
  