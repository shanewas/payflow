const request = require('supertest');
const app = require('../../../src/app');
const stripe = require('../../../src/config/stripe');
const Payment = require('../../../src/models/Payment');

// Mock dependencies
jest.mock('../../../src/config/stripe');
jest.mock('../../../src/models/Payment');

describe('POST /webhooks/stripe', () => {
  const endpointSecret = 'whsec_test_secret';
  process.env.STRIPE_WEBHOOK_SECRET = endpointSecret;

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createStripeEvent = (type, data) => ({
    id: 'evt_123',
    object: 'event',
    api_version: '2020-08-27',
    created: Date.now(),
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_123',
      idempotency_key: null,
    },
    type: type,
  });

  const createSignature = (payload) => {
    // This is a simplified mock. In a real scenario, you'd use crypto.
    // However, we mock constructEvent, so the signature content doesn't matter.
    return 't=123,v1=mock_signature';
  };

  it('should return 400 if signature verification fails', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const eventPayload = { id: 'pi_123', amount: 1000 };
    const stripeEvent = createStripeEvent('payment_intent.succeeded', eventPayload);
    const payload = JSON.stringify(stripeEvent);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'invalid_signature')
      .send(payload);

    expect(response.status).toBe(400);
  });

  it('should handle payment_intent.succeeded event', async () => {
    const eventPayload = { id: 'pi_succeeded', amount: 2000 };
    const stripeEvent = createStripeEvent('payment_intent.succeeded', eventPayload);
    stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);
    
    await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

    expect(Payment.updateStatusByStripeId).toHaveBeenCalledWith('pi_succeeded', 'succeeded');
  });

  it('should handle payment_intent.payment_failed event', async () => {
    const eventPayload = { id: 'pi_failed', amount: 3000 };
    const stripeEvent = createStripeEvent('payment_intent.payment_failed', eventPayload);
    stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

    await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));
    
    expect(Payment.updateStatusByStripeId).toHaveBeenCalledWith('pi_failed', 'failed');
  });

  it('should handle payment_intent.canceled event', async () => {
    const eventPayload = { id: 'pi_canceled', amount: 4000 };
    const stripeEvent = createStripeEvent('payment_intent.canceled', eventPayload);
    stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);
    
    await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

    expect(Payment.updateStatusByStripeId).toHaveBeenCalledWith('pi_canceled', 'canceled');
  });
});
