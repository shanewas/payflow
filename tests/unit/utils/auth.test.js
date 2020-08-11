const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../../../src/utils/password');
const { generateToken, verifyToken, generateRefreshToken } = require('../../../src/utils/jwt');

// Mock environment variables
process.env.JWT_ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.JWT_ACCESS_TOKEN_EXPIRATION = '1s';
process.env.JWT_REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_TOKEN_EXPIRATION = '2s';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a plain text password', async () => {
      const password = 'mysecretpassword';
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
    });

    it('should correctly compare a password with its hash', async () => {
      const password = 'mysecretpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password comparison', async () => {
      const password = 'mysecretpassword';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const isMatch = await comparePassword(wrongPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Utilities', () => {
    const payload = { userId: '12345' };

    it('should generate a valid access token', () => {
      const token = generateToken(payload);
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
      expect(decoded.userId).toBe(payload.userId);
    });

    it('should generate a valid refresh token', () => {
        const token = generateRefreshToken(payload);
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET);
        expect(decoded.userId).toBe(payload.userId);
      });

    it('should verify a valid token', () => {
      const token = jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '1m' });
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
    });

    it('should return null for an invalid token signature', () => {
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1m' });
      const decoded = verifyToken(token);
      expect(decoded).toBeNull();
    });

    it('should return null for an expired token', (done) => {
      const token = generateToken(payload);
      // Set a timeout to allow the token to expire
      setTimeout(() => {
        const decoded = verifyToken(token);
        expect(decoded).toBeNull();
        done();
      }, 1500); // Wait 1.5 seconds, which is longer than the 1s expiration
    }, 2000); // Jest timeout
  });
});
