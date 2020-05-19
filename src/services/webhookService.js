const Payment = require('../models/Payment');
// const Order = require('../models/Order'); // Will be added in a future phase

const handleWebhookEvent = async (event) => {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      const payment = await Payment.updateStatusByStripeId(paymentIntent.id, 'succeeded');
      if (payment) {
        // TODO: Update order status to 'paid' or 'processing'
        // await Order.updateStatusByPaymentId(payment.id, 'paid');
        console.log(`Updated payment ${payment.id} status to succeeded.`);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} failed.`);
      const payment = await Payment.updateStatusByStripeId(paymentIntent.id, 'failed');
      if (payment) {
        // TODO: Update order status to 'failed'
        console.log(`Updated payment ${payment.id} status to failed.`);
      }
      break;
    }
    case 'payment_intent.canceled': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was canceled.`);
      const payment = await Payment.updateStatusByStripeId(paymentIntent.id, 'canceled');
      if (payment) {
          // TODO: Update order status to 'canceled'
          console.log(`Updated payment ${payment.id} status to canceled.`);
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
};

module.exports = {
  handleWebhookEvent,
};
