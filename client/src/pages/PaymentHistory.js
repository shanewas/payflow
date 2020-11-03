import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './PaymentHistory.css';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/payments?page=${page}&limit=10`);
        if (response.data.length === 0) {
          setHasMore(false);
        }
        setPayments(prevPayments => [...prevPayments, ...response.data]);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch payment history.');
        setLoading(false);
      }
    };

    if (user) {
      fetchPayments();
    }
  }, [user, page]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'succeeded':
        return 'status-succeeded';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };
  
  return (
    <div className="payment-history-container">
      <h2>Payment History</h2>
      {error && <p className="error-message">{error}</p>}
      {payments.length === 0 && !loading && <p>No payment history found.</p>}
      <ul className="payment-list">
        {payments.map((payment) => (
          <li key={payment.id} className="payment-item">
            <div className="payment-details">
              <p><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}</p>
              <p><strong>Date:</strong> {new Date(payment.created_at).toLocaleDateString()}</p>
            </div>
            <div className="payment-status">
              <span className={`status-badge ${getStatusClass(payment.status)}`}>{payment.status}</span>
            </div>
          </li>
        ))}
      </ul>
      {loading && <p>Loading...</p>}
      <div className="pagination-controls">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>
          Previous
        </button>
        <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading}>
          Next
        </button>
      </div>
    </div>
  );
};

export default PaymentHistory;
