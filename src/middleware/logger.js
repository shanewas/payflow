const morgan = require('morgan');

// Define custom tokens
// Note: These will only work if the data is available on the request object.
// The user ID should be available after the auth middleware.
// The payment ID is specific to certain routes.
morgan.token('user-id', (req) => (req.user ? req.user.id : 'anonymous'));
morgan.token('payment-id', (req) => (req.params.id ? req.params.id : '-'));

const logger = () => {
    if (process.env.NODE_ENV === 'development') {
        return morgan('dev');
    }

    // Customize the 'combined' format to include our custom tokens at the end
    const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" user-id::user-id payment-id::payment-id';
    
    return morgan(prodFormat, {
        skip: (req, res) => res.statusCode < 400, // Only log error responses
    });
};

module.exports = logger;
