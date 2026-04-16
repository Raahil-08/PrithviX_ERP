import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Package, CreditCard, BarChart3,
  MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, Menu, X, Wheat
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/farmers', label: 'Farmers', icon: Users },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/credit', label: 'Udhaar / Credit', icon: CreditCard },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/ai-chat', label: 'AI Agronomist', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#0E1A14] flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-[#1A3C2B] text-white transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        data-testid="sidebar-navigation"
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-lg bg-[#D4A853] flex items-center justify-center flex-shrink-0">
            <Wheat className="w-5 h-5 text-[#1A3C2B]" />
          </div>
          {!collapsed && (
            <span className="font-serif text-xl tracking-tight text-white">Prithvix</span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-1 hover:bg-white/10 rounded"
            data-testid="close-mobile-menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                data-testid={`nav-${item.path.slice(1)}`}
                className={`flex items-center mx-2 mb-1 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/15 text-[#D4A853]'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                } ${collapsed ? 'justify-center' : 'gap-3'}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#D4A853]' : ''}`} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={toggleTheme}
            data-testid="theme-toggle"
            className={`flex items-center w-full px-3 py-2 rounded-lg text-white/70 hover:bg-white/8 hover:text-white transition-colors ${collapsed ? 'justify-center' : 'gap-3'}`}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!collapsed && <span className="text-sm">{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={logout}
            data-testid="logout-button"
            className={`flex items-center w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors ${collapsed ? 'justify-center' : 'gap-3'}`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#D4A853] text-[#1A3C2B] rounded-full items-center justify-center shadow-md hover:scale-110 transition-transform"
          data-testid="sidebar-collapse-toggle"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#14251D]/80 backdrop-blur-xl border-b border-[#D8D3CB] dark:border-[#2B4738] flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] transition-colors"
            data-testid="mobile-menu-toggle"
          >
            <Menu className="w-5 h-5 text-[#0E1A14] dark:text-[#F5F0E8]" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{user?.name}</p>
              <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7] capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#1A3C2B] flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page content with animation */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
