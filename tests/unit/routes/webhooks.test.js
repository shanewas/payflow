process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

// Mock stripe before importing app
jest.mock('../../../src/config/stripe', () => {
  const mockConstructEvent = jest.fn();
  return {
    stripe: {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    },
    isStripeError: jest.fn(),
    classifyStripeError: jest.fn(),
  };
});

const request = require('supertest');
const app = require('../../../src/app');
const { stripe } = require('../../../src/config/stripe');
const Payment = require('../../../src/models/Payment');
const Order = require('../../../src/models/Order');
const WebhookEvent = require('../../../src/models/WebhookEvent');

// Mock other dependencies
jest.mock('../../../src/models/Payment');
jest.mock('../../../src/models/Order');
jest.mock('../../../src/models/WebhookEvent');

describe('POST /webhooks/stripe', () => {
  const endpointSecret = 'whsec_test_secret';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createStripeEvent = (eventId, type, data) => ({
    id: eventId,
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
    return 't=123,v1=mock_signature';
  };

  it('should return 400 if signature verification fails', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const eventPayload = { id: 'pi_123', amount: 1000 };
    const stripeEvent = createStripeEvent('evt_123', 'payment_intent.succeeded', eventPayload);
    const payload = JSON.stringify(stripeEvent);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'invalid_signature')
      .send(payload);

    expect(response.status).toBe(400);
  });

  describe('idempotency handling', () => {
    it('should skip processing if event is already processed', async () => {
      const eventPayload = { id: 'pi_succeeded', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_duplicate', 'payment_intent.succeeded', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue({
        id: 'wh_123',
        event_id: 'evt_duplicate',
        status: 'processed',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.findByEventId).toHaveBeenCalledWith('evt_duplicate');
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
    });

    it('should skip processing when ON CONFLICT returns empty and event is already processed', async () => {
      const eventPayload = { id: 'pi_conflict', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_conflict_processed', 'payment_intent.succeeded', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.create.mockResolvedValue(undefined);
      WebhookEvent.findByEventId.mockResolvedValue({
        id: 'wh_456',
        event_id: 'evt_conflict_processed',
        status: 'processed',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).toHaveBeenCalled();
      expect(WebhookEvent.findByEventId).toHaveBeenCalledWith('evt_conflict_processed');
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should skip processing when ON CONFLICT returns empty and event is being processed concurrently', async () => {
      const eventPayload = { id: 'pi_concurrent', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_concurrent', 'payment_intent.succeeded', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.create.mockResolvedValue(undefined);
      WebhookEvent.findByEventId.mockResolvedValue({
        id: 'wh_789',
        event_id: 'evt_concurrent',
        status: 'pending',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).toHaveBeenCalled();
      expect(WebhookEvent.findByEventId).toHaveBeenCalledWith('evt_concurrent');
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should process new event and mark as processed', async () => {
      const eventPayload = { id: 'pi_new', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_new', 'payment_intent.succeeded', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_new' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_new', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_new',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'succeeded',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'pending' },
      });
      Order.updateStatus.mockResolvedValue({ id: 'ord_123', status: 'processing' });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).toHaveBeenCalledWith({
        event_id: 'evt_new',
        event_type: 'payment_intent.succeeded',
        payment_intent_id: 'pi_new',
      });
      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'succeeded');
      expect(WebhookEvent.markAsProcessed).toHaveBeenCalledWith('evt_new');
    });
  });

  describe('status transition protection', () => {
    it('should not update payment if new status is not newer', async () => {
      const eventPayload = { id: 'pi_failed', amount: 3000 };
      const stripeEvent = createStripeEvent('evt_old_status', 'payment_intent.payment_failed', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_old_status' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_old_status', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_failed',
        status: 'succeeded',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).not.toHaveBeenCalled();
      expect(Order.updateStatus).not.toHaveBeenCalled();
      expect(WebhookEvent.markAsProcessed).toHaveBeenCalledWith('evt_old_status');
    });

    it('should not update order if new status is not newer', async () => {
      const eventPayload = { id: 'pi_failed_2', amount: 4000 };
      const stripeEvent = createStripeEvent('evt_order_status', 'payment_intent.payment_failed', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_order_status' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_order_status', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_failed_2',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'failed',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'delivered' },
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'failed');
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('payment intent events', () => {
    beforeEach(() => {
      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({});
      WebhookEvent.markAsProcessed.mockResolvedValue({});
      Payment.findDetailsById.mockResolvedValue({ order: null });
    });

    it('should handle payment_intent.succeeded event', async () => {
      const eventPayload = { id: 'pi_succeeded_2', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_succeeded', 'payment_intent.succeeded', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_succeeded_2',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'succeeded',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'succeeded');
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const eventPayload = { id: 'pi_failed_3', amount: 3000 };
      const stripeEvent = createStripeEvent('evt_failed', 'payment_intent.payment_failed', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_failed_3',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'failed',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'failed');
    });

    it('should handle payment_intent.canceled event', async () => {
      const eventPayload = { id: 'pi_canceled_2', amount: 4000 };
      const stripeEvent = createStripeEvent('evt_canceled', 'payment_intent.canceled', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_canceled_2',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'canceled',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'canceled');
    });

    it('should handle payment_intent.processing event', async () => {
      const eventPayload = { id: 'pi_processing', amount: 5000 };
      const stripeEvent = createStripeEvent('evt_processing', 'payment_intent.processing', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_processing',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'processing',
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'processing');
    });
  });

  describe('unhandled event types', () => {
    it('should skip payment_intent.created event without updating payment', async () => {
      const eventPayload = { id: 'pi_created', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_created', 'payment_intent.created', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).not.toHaveBeenCalled();
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should skip payment_intent.requires_payment_method event without updating payment', async () => {
      const eventPayload = { id: 'pi_requires_pm', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_requires_pm', 'payment_intent.requires_payment_method', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).not.toHaveBeenCalled();
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
    });

    it('should skip payment_intent.requires_confirmation event without updating payment', async () => {
      const eventPayload = { id: 'pi_requires_conf', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_requires_conf', 'payment_intent.requires_confirmation', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).not.toHaveBeenCalled();
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
    });

    it('should skip payment_intent.requires_action event without updating payment', async () => {
      const eventPayload = { id: 'pi_requires_action', amount: 2000 };
      const stripeEvent = createStripeEvent('evt_requires_action', 'payment_intent.requires_action', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(WebhookEvent.create).not.toHaveBeenCalled();
      expect(Payment.findByStripeId).not.toHaveBeenCalled();
      expect(Payment.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('order status protection for shipped/delivered orders', () => {
    it('should not update shipped order to cancelled when receiving failed webhook', async () => {
      const eventPayload = { id: 'pi_failed_shipped', amount: 3000 };
      const stripeEvent = createStripeEvent('evt_failed_shipped', 'payment_intent.payment_failed', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_failed_shipped' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_failed_shipped', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_failed_shipped',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'failed',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'shipped' },
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'failed');
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should not update shipped order to cancelled when receiving canceled webhook', async () => {
      const eventPayload = { id: 'pi_canceled_shipped', amount: 4000 };
      const stripeEvent = createStripeEvent('evt_canceled_shipped', 'payment_intent.canceled', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_canceled_shipped' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_canceled_shipped', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_canceled_shipped',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'canceled',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'shipped' },
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'canceled');
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should not update delivered order to cancelled when receiving failed webhook', async () => {
      const eventPayload = { id: 'pi_failed_delivered', amount: 3000 };
      const stripeEvent = createStripeEvent('evt_failed_delivered', 'payment_intent.payment_failed', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_failed_delivered' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_failed_delivered', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_failed_delivered',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'failed',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'delivered' },
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'failed');
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });

    it('should not update delivered order to cancelled when receiving canceled webhook', async () => {
      const eventPayload = { id: 'pi_canceled_delivered', amount: 4000 };
      const stripeEvent = createStripeEvent('evt_canceled_delivered', 'payment_intent.canceled', eventPayload);
      stripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      WebhookEvent.findByEventId.mockResolvedValue(null);
      WebhookEvent.create.mockResolvedValue({ event_id: 'evt_canceled_delivered' });
      WebhookEvent.markAsProcessed.mockResolvedValue({ event_id: 'evt_canceled_delivered', status: 'processed' });

      Payment.findByStripeId.mockResolvedValue({
        id: 'pay_123',
        stripe_payment_intent_id: 'pi_canceled_delivered',
        status: 'requires_payment_method',
      });
      Payment.updateStatus.mockResolvedValue({
        id: 'pay_123',
        status: 'canceled',
      });
      Payment.findDetailsById.mockResolvedValue({
        id: 'pay_123',
        order: { id: 'ord_123', status: 'delivered' },
      });

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', createSignature(JSON.stringify(stripeEvent)))
        .send(JSON.stringify(stripeEvent));

      expect(Payment.updateStatus).toHaveBeenCalledWith('pay_123', 'canceled');
      expect(Order.updateStatus).not.toHaveBeenCalled();
    });
  });
});
