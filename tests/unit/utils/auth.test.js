const { hashPassword, comparePassword } = require('../../../src/utils/password');
const { generateToken, verifyToken } = require('../../../src/utils/jwt');

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'mysecretpassword';
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toEqual(password);
    });

    it('should compare a correct password and return true', async () => {
      const password = 'mysecretpassword';
      const hashedPassword = await hashPassword(password);
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should compare an incorrect password and return false', async () => {
      const password = 'mysecretpassword';
      const incorrectPassword = 'wrongpassword';
      const hashedPassword = await hashPassword(password);
      const isMatch = await comparePassword(incorrectPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Utilities', () => {
    const payload = { userId: 1, email: 'test@example.com' };
    // Mock environment variables for JWT
    process.env.JWT_ACCESS_TOKEN_SECRET = 'a-very-secret-key';
    process.env.JWT_ACCESS_TOKEN_EXPIRATION = '15m';


    it('should generate a valid JWT', () => {
      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid token and return the payload', () => {
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded).toMatchObject(payload);
    });

    it('should return null for an invalid token', () => {
      const invalidToken = 'invalid.token.string';
      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for an expired token', () => {
        // Create an expired token
        const expiredToken = generateToken(payload, { expiresIn: '-1s' });
        const decoded = verifyToken(expiredToken);
        // The current implementation of verifyToken catches the error and returns null
        expect(decoded).toBeNull();
    });
  });
});
