const express = require('express');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    // Simple validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({ email, password_hash, full_name });

    const token = generateToken({ userId: user.id });

    res.status(201).json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
