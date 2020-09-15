const request = require('supertest');
const express = require('express');
const knex = require('../../../src/config/database');
const app = require('../../../src/app');
const { User, Order, Payment } = require('../../../src/models');
const stripe = require('../../../src/config/stripe');
const { generateToken } = require('../../../src/utils/jwt');

describe('Payment Flow Integration', () => {
  let server;
  let user;
  let token;
  let order;
  let payment;

  beforeAll(async () => {
    server = app.listen(0);
    await knex.migrate.latest();
  });

  afterAll(async () => {
    await knex.migrate.rollback();
    await knex.destroy();
    server.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await knex('payments').del();
    await knex('orders').del();
    await knex('users').del();

    // Create a user
    user = await User.query().insert({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    token = generateToken({ id: user.id });

    // Create an order
    order = await Order.query().insert({
      user_id: user.id,
      amount: 1000, // $10.00
      currency: 'usd',
      status: 'pending',
    });
  });

  it('should complete the payment flow successfully', async () => {
    // 1. Perform checkout
    const checkoutResponse = await request(server)
      .post('/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id });

    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body).toHaveProperty('sessionId');
    const { sessionId } = checkoutResponse.body;

    // Verify payment was created with 'pending' status
    payment = await Payment.query().findOne({ order_id: order.id });
    expect(payment).toBeDefined();
    expect(payment.status).toBe('pending');
    expect(payment.stripe_charge_id).not.toBeNull();


    // 2. Simulate Stripe webhook for successful payment
    const stripeChargeId = payment.stripe_charge_id;
    const event = {
      id: 'evt_test_webhook',
      object: 'event',
      api_version: '2020-08-27',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: stripeChargeId,
          object: 'checkout.session',
          payment_status: 'paid',
          metadata: {
            order_id: order.id.toString(),
            payment_id: payment.id.toString(),
          }
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: 'checkout.session.completed',
    };

    const signature = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(event, null, 2),
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const webhookResponse = await request(server)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(event);

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toEqual({ received: true });

    // 3. Verify final status in the database
    const updatedPayment = await Payment.query().findById(payment.id);
    const updatedOrder = await Order.query().findById(order.id);

    expect(updatedPayment.status).toBe('succeeded');
    expect(updatedOrder.status).toBe('completed');
  });
});
