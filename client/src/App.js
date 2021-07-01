import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CheckoutPage from './pages/CheckoutPage';
import PaymentHistory from './pages/PaymentHistory';
import './App.css';

// PrivateRoute component to protect authenticated routes
function PrivateRoute({ element, path }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

function App() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Payflow</h1>
          <nav>
            {!isAuthenticated ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <>
                <Link to="/checkout">Checkout</Link>
                <Link to="/history">Payment History</Link>
                <button onClick={logout}>Logout</button>
              </>
            )}
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/checkout" />} />
            <Route path="/register" element={<Register />} />
            <Route path="/checkout" element={<PrivateRoute element={<CheckoutPage />} />} />
            <Route path="/history" element={<PrivateRoute element={<PaymentHistory />} />} />
            {/* Redirect to login or a dashboard if logged in */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/checkout" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
