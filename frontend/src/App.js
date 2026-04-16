import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import Inventory from './pages/Inventory';
import Credit from './pages/Credit';
import Analytics from './pages/Analytics';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="farmers" element={<Farmers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="credit" element={<Credit />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
