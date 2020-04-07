const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

  return res.status(422).json({
    errors: extractedErrors,
  });
};

const registerValidation = () => {
  return [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('full_name').notEmpty().withMessage('Full name is required'),
  ];
};

const loginValidation = () => {
    return [
      body('email').isEmail().withMessage('Must be a valid email address'),
      body('password').notEmpty().withMessage('Password is required'),
    ];
};

const paymentIntentValidation = () => {
    return [
        body('amount').isInt({ gt: 0 }).withMessage('Amount must be a positive integer'),
        body('currency').isString().isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
    ]
}

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  paymentIntentValidation
};
