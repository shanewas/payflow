import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import './PaymentForm.css';

const PaymentForm = ({ orderId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setProcessing(true);

    try {
      const { data: { clientSecret, paymentId } } = await api.post('/checkout', { orderId });
      
      const cardElement = elements.getElement(CardElement);

      const paymentResult = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (paymentResult.error) {
        setError(`Payment failed: ${paymentResult.error.message}`);
        setProcessing(false);
      } else {
        if (paymentResult.paymentIntent.status === 'succeeded') {
          setSucceeded(true);
          setError(null);
        }
        setProcessing(false);
      }
    } catch (err) {
      setError('An error occurred during checkout.');
      setProcessing(false);
    }
  };

  return (
    <div className="payment-form-container">
      <form onSubmit={handleSubmit}>
        <div className="card-element-wrapper">
          <CardElement />
        </div>
        <button className="pay-button" disabled={processing || succeeded}>
          {processing ? 'Processing...' : 'Pay'}
        </button>
        {error && <div className="payment-error">{error}</div>}
        {succeeded && <div className="payment-success">Payment Succeeded!</div>}
      </form>
    </div>
  );
};

export default PaymentForm;
