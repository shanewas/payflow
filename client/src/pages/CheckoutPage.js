import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '../components/PaymentForm';

// Make sure to call `loadStripe` outside of a componentfs render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const CheckoutPage = () => {
  // This is a placeholder for a real order ID from your application state
  const orderId = 1; 

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
