const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const hpp = require('hpp');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const orderRoutes = require('./routes/orders');
const checkoutRoutes = require('./routes/checkout');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(hpp());

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(logger());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/payments', paymentRoutes);
app.use('/orders', orderRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/webhooks', webhookRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Global error handler
app.use(errorHandler);

module.exports = app;
