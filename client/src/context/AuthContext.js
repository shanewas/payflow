import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Function to clear all cookies for the current domain
const clearAllCookies = () => {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    // Basic check for token validity, you could add JWT decoding here for more robustness
    if (storedToken && storedToken.length < 500) { // Simple sanity check for length
      return storedToken;
    }
    localStorage.removeItem('token');
    clearAllCookies(); // Also clear cookies if the token is bad
    return null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // You might want to fetch user data here if the token exists
      // For now, we'll just assume the token is valid
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      return response;
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const register = async (firstName, lastName, email, password) => {
    try {
      const response = await api.post('/auth/register', { firstName, lastName, email, password });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      return response;
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    login,
    logout,
    register,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
