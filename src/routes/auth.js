const express = require('express');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { generalLimiter, loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', generalLimiter, validateRegistration, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const fullName = `${firstName} ${lastName}`.trim();

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({ email, password_hash, full_name: fullName });

    const token = generateToken({ userId: user.id });

    res.status(201).json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', loginLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    res.status(200).json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
