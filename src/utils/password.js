const bcrypt = require('bcryptjs');

const saltRounds = 10;

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(plainPassword, salt);
  return hash;
}

async function comparePassword(plainPassword, hash) {
  const isMatch = await bcrypt.compare(plainPassword, hash);
  return isMatch;
}

module.exports = {
  hashPassword,
  comparePassword,
};
