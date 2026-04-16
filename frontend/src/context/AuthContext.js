import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
const authDisabled = String(process.env.REACT_APP_AUTH_DISABLED || '').toLowerCase() !== 'false';

const devUser = {
  id: 'dev-user',
  name: 'Prithvix Team',
  email: 'dev@prithvix.local',
  username: 'dev',
  role: 'dealer',
  token: 'dev-session',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (authDisabled) {
      setUser(devUser);
      setLoading(false);
      return;
    }

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
    if (authDisabled) {
      localStorage.setItem('prithvix_token', devUser.token);
      localStorage.setItem('prithvix_user', JSON.stringify(devUser));
      setUser(devUser);
      return devUser;
    }

    const res = await api.post('/api/auth/login', credentials);
    const data = res.data;
    localStorage.setItem('prithvix_token', data.token);
    localStorage.setItem('prithvix_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    if (authDisabled) {
      setUser(devUser);
      return;
    }

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
