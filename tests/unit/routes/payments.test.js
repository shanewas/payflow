const request = require('supertest');
const app = require('../../../src/app');
const stripe = require('../../../src/config/stripe');
const Payment = require('../../../src/models/Payment');
const { generateToken } = require('../../../src/utils/jwt');

// Mock the dependencies
jest.mock('../../../src/config/stripe');
jest.mock('../../../src/models/Payment');

describe('POST /payments/intent', () => {
  let token;

  beforeAll(() => {
    // Mock user for auth middleware
    const user = { id: 'a-fake-user-id', email: 'test@example.com' };
    token = generateToken({ userId: user.id });
    // Mock user lookup in auth middleware
    const User = require('../../../src/models/User');
    jest.spyOn(User, 'findById').mockResolvedValue(user);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a payment intent and save it to the database', async () => {
    const mockPaymentIntent = {
      id: 'pi_123',
      client_secret: 'pi_123_secret_456',
    };
    stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
    Payment.create.mockResolvedValue({ id: 'db_payment_id', ...mockPaymentIntent });

    const response = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 2000,
        currency: 'usd',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('client_secret', mockPaymentIntent.client_secret);
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 2000,
      currency: 'usd',
    });
    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        stripe_payment_intent_id: mockPaymentIntent.id,
        user_id: 'a-fake-user-id',
        amount: 2000,
        currency: 'usd',
        status: 'pending'
    }));
  });

  it('should return 401 if user is not authenticated', async () => {
    const response = await request(app)
      .post('/payments/intent')
      .send({
        amount: 2000,
        currency: 'usd',
      });

    expect(response.status).toBe(401);
  });

  it('should return 500 if Stripe API fails', async () => {
    stripe.paymentIntents.create.mockRejectedValue(new Error('Stripe API Error'));

    const response = await request(app)
      .post('/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 2000,
        currency: 'usd',
      });

    expect(response.status).toBe(500);
  });
});
