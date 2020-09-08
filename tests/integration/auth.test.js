const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/config/database');

// This test requires a running test database.
// Before all tests, we will clear the users table.
describe('Auth Flow Integration Test', () => {

  beforeAll(async () => {
    // In a real project, you would use migrations to set up and tear down the test DB.
    // For this test, we'll just clear the users table.
    try {
        await db.query('DELETE FROM users');
    } catch(e) {
        console.error("Could not clean users table. Make sure test database is running and schema is applied.", e);
    }
  });

  afterAll(async () => {
    // Close the database connection
    await db.close();
  });

  const user = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'password123',
    full_name: 'Test User',
  };
  let token;

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(user);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(user.email);
  });

  it('should log in the new user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    token = response.body.token;
  });

  it('should access a protected route with the token', async () => {
    const response = await request(app)
      .get('/payments') // Assuming /payments is a protected route
      .set('Authorization', `Bearer ${token}`);
    
    // We expect a 200, even if there are no payments, as the auth should pass
    expect(response.status).toBe(200);
  });

  it('should fail to access a protected route without a token', async () => {
    const response = await request(app)
      .get('/payments');
    
    expect(response.status).toBe(401);
  });
});
