const Payment = require('../models/Payment');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');

const PAYMENT_STATUS_FINAL = ['succeeded', 'refunded'];
const PAYMENT_STATUS_PRIORITY = {
  'requires_payment_method': 1,
  'requires_confirmation': 2,
  'requires_action': 3,
  'processing': 4,
  'canceled': 5,
  'failed': 5,
  'succeeded': 10,
  'refunded': 15,
};

const ORDER_STATUS_PRIORITY = {
  'pending': 1,
  'processing': 5,
  'shipped': 10,
  'delivered': 15,
  'cancelled': 20,
};

const canUpdatePaymentStatus = (currentStatus, newStatus) => {
  if (!currentStatus) return true;
  if (PAYMENT_STATUS_FINAL.includes(currentStatus)) {
    return PAYMENT_STATUS_PRIORITY[newStatus] > PAYMENT_STATUS_PRIORITY[currentStatus];
  }
  return PAYMENT_STATUS_PRIORITY[newStatus] >= PAYMENT_STATUS_PRIORITY[currentStatus];
};

const canUpdateOrderStatus = (currentStatus, newStatus) => {
  if (!currentStatus) return true;
  return ORDER_STATUS_PRIORITY[newStatus] > ORDER_STATUS_PRIORITY[currentStatus];
};

const getOrderStatusFromPaymentStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case 'succeeded':
      return 'processing';
    case 'failed':
    case 'canceled':
      return 'cancelled';
    default:
      return null;
  }
};

const processPaymentIntentEvent = async (event, newStatus) => {
  const eventId = event.id;
  const paymentIntent = event.data.object;
  const stripePaymentIntentId = paymentIntent.id;

  const existingEvent = await WebhookEvent.findByEventId(eventId);
  if (existingEvent && existingEvent.status === 'processed') {
    console.log(`Event ${eventId} has already been processed. Skipping.`);
    return { skipped: true, reason: 'already_processed' };
  }

  if (!existingEvent) {
    await WebhookEvent.create({
      event_id: eventId,
      event_type: event.type,
      payment_intent_id: stripePaymentIntentId,
    });
  }

  const existingPayment = await Payment.findByStripeId(stripePaymentIntentId);
  if (!existingPayment) {
    console.log(`Payment with stripe_payment_intent_id ${stripePaymentIntentId} not found.`);
    await WebhookEvent.markAsFailed(eventId);
    return { skipped: true, reason: 'payment_not_found' };
  }

  if (!canUpdatePaymentStatus(existingPayment.status, newStatus)) {
    console.log(
      `Cannot update payment ${existingPayment.id} from ${existingPayment.status} to ${newStatus}. ` +
      `New status is not newer.`
    );
    await WebhookEvent.markAsProcessed(eventId);
    return { skipped: true, reason: 'status_not_newer' };
  }

  const updatedPayment = await Payment.updateStatus(existingPayment.id, newStatus);
  console.log(`Updated payment ${updatedPayment.id} status to ${newStatus}.`);

  const orderStatus = getOrderStatusFromPaymentStatus(newStatus);
  if (orderStatus) {
    const paymentDetails = await Payment.findDetailsById(updatedPayment.id);
    const order = paymentDetails?.order;
    
    if (order) {
      if (canUpdateOrderStatus(order.status, orderStatus)) {
        await Order.updateStatus(order.id, orderStatus);
        console.log(`Updated order ${order.id} status to ${orderStatus}.`);
      } else {
        console.log(
          `Cannot update order ${order.id} from ${order.status} to ${orderStatus}. ` +
          `New status is not newer.`
        );
      }
    }
  }

  await WebhookEvent.markAsProcessed(eventId);
  return { 
    processed: true, 
    payment: updatedPayment,
    eventId 
  };
};

const handleWebhookEvent = async (event) => {
  const eventId = event.id;
  const eventType = event.type;

  console.log(`Processing webhook event: ${eventType} (${eventId})`);

  try {
    switch (eventType) {
      case 'payment_intent.succeeded': {
        const result = await processPaymentIntentEvent(event, 'succeeded');
        if (result.skipped) {
          console.log(`Event ${eventId} skipped: ${result.reason}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const result = await processPaymentIntentEvent(event, 'failed');
        if (result.skipped) {
          console.log(`Event ${eventId} skipped: ${result.reason}`);
        }
        break;
      }
      case 'payment_intent.canceled': {
        const result = await processPaymentIntentEvent(event, 'canceled');
        if (result.skipped) {
          console.log(`Event ${eventId} skipped: ${result.reason}`);
        }
        break;
      }
      case 'payment_intent.processing': {
        const result = await processPaymentIntentEvent(event, 'processing');
        if (result.skipped) {
          console.log(`Event ${eventId} skipped: ${result.reason}`);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${eventId}:`, error);
    try {
      await WebhookEvent.markAsFailed(eventId, error.message);
    } catch (dbError) {
      console.error(`Failed to mark event ${eventId} as failed:`, dbError);
    }
    throw error;
  }
};

module.exports = {
  handleWebhookEvent,
  canUpdatePaymentStatus,
  canUpdateOrderStatus,
  getOrderStatusFromPaymentStatus,
};
