import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('prithvix_token');
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('prithvix_token');
      localStorage.removeItem('prithvix_user');
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await api.post('/api/auth/login', credentials);
    const data = res.data;
    localStorage.setItem('prithvix_token', data.token);
    localStorage.setItem('prithvix_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    localStorage.removeItem('prithvix_token');
    localStorage.removeItem('prithvix_user');
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
