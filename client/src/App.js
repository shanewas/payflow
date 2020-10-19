import React from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

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
          <div>
            <h2>Welcome!</h2>
            {/* Checkout page will go here */}
          </div>
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
