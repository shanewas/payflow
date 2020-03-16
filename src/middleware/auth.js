const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication invalid.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Authentication invalid.' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found.' });
  }
  
  // Attach the user to the request object
  req.user = user;

  next();
}

module.exports = auth;
