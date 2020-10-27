import React from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CheckoutPage from './pages/CheckoutPage';

function App() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <h1>Payflow</h1>
        {isAuthenticated ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <div>
            <p>Please log in or register.</p>
          </div>
        )}
      </header>
      <main>
        {isAuthenticated ? (
          <CheckoutPage />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <Login />
            <Register />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
