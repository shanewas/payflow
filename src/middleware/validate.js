const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errArr = errors.array();
    console.warn('Validation failed:', errArr);
    return res.status(400).json({ errors: errArr });
  }
  next();
};

const validateRegistration = [
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter'),
  body('firstName').not().isEmpty().withMessage('First name is required'),
  body('lastName').not().isEmpty().withMessage('Last name is required'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password').not().isEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validatePaymentCreation = [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('currency').isISO4217().withMessage('Invalid currency code'),
    handleValidationErrors,
];


module.exports = {
  validateRegistration,
  validateLogin,
  validatePaymentCreation,
};
