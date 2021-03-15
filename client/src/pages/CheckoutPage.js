import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '../components/PaymentForm';

// Call loadStripe outside of render to avoid recreating the Stripe object.
const stripePublishableKey =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  process.env.REACT_APP_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const CheckoutPage = () => {
  // Placeholder order id until real order state is wired.
  const orderId = 1;

  if (!stripePromise) {
    return (
      <div>
        <h2>Checkout</h2>
        <p>
          Stripe publishable key is missing. Set
          {' '}<code>REACT_APP_STRIPE_PUBLISHABLE_KEY</code>{' '}in
          {' '}<code>client/.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2>Checkout</h2>
      <Elements stripe={stripePromise}>
        <PaymentForm orderId={orderId} />
      </Elements>
    </div>
  );
};

export default CheckoutPage;
