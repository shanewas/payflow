const User = require('../../../src/models/User');
const db = require('../../../src/config/database');

jest.mock('../../../src/config/database');

describe('User Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user and return it', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
      };
      const expectedUser = { id: 1, ...userData, created_at: new Date() };
      db.query.mockResolvedValue({ rows: [expectedUser] });

      const user = await User.create(userData);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
        [userData.email, userData.password_hash, userData.full_name]
      );
      expect(user).toEqual(expectedUser);
    });

    it('should throw an error if the database query fails', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
      };
      db.query.mockRejectedValue(new Error('DB error'));

      await expect(User.create(userData)).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should find a user by ID and return it', async () => {
      const expectedUser = { id: 1, email: 'test@example.com' };
      db.query.mockResolvedValue({ rows: [expectedUser] });

      const user = await User.findById(1);

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(user).toEqual(expectedUser);
    });

    it('should return undefined if user is not found', async () => {
        db.query.mockResolvedValue({ rows: [] });
  
        const user = await User.findById(999);
  
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [999]);
        expect(user).toBeUndefined();
      });
  });

  describe('findByEmail', () => {
    it('should find a user by email and return it', async () => {
      const expectedUser = { id: 1, email: 'test@example.com' };
      db.query.mockResolvedValue({ rows: [expectedUser] });

      const user = await User.findByEmail('test@example.com');

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['test@example.com']);
      expect(user).toEqual(expectedUser);
    });

    it('should return undefined if user is not found', async () => {
        db.query.mockResolvedValue({ rows: [] });
  
        const user = await User.findByEmail('notfound@example.com');
  
        expect(user).toBeUndefined();
      });
  });

});
