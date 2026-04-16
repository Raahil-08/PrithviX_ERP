import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  UserPlus, Eye, IndianRupee, AlertTriangle,
  Users, ShoppingBag, MessageSquare, BarChart3,
  ArrowRight, Clock, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/activity'),
      api.get('/api/dashboard/overdue')
    ]).then(([s, a, o]) => {
      setStats(s.data);
      setActivities(a.data);
      setOverdue(o.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const kpis = stats ? [
    { label: "Today's Registrations", value: stats.today_registrations, icon: UserPlus, color: 'text-[#2E7D32]', bg: 'bg-[#2E7D32]/10' },
    { label: 'Total Visits', value: stats.total_visits, icon: Eye, color: 'text-[#1A3C2B]', bg: 'bg-[#1A3C2B]/10' },
    { label: 'Money Collected', value: `Rs ${(stats.money_collected || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-[#2E7D32]', bg: 'bg-[#2E7D32]/10' },
    { label: 'Money Due', value: `Rs ${(stats.money_due || 0).toLocaleString('en-IN')}`, icon: Wallet, color: 'text-[#D4A853]', bg: 'bg-[#D4A853]/10' },
    { label: 'Outstanding Udhaar', value: `Rs ${(stats.total_outstanding || 0).toLocaleString('en-IN')}`, icon: AlertTriangle, color: 'text-[#D35400]', bg: 'bg-[#D35400]/10' },
  ] : [];

  const quickActions = [
    { label: 'Register Farmer', icon: Users, path: '/farmers' },
    { label: 'New Sale', icon: ShoppingBag, path: '/inventory' },
    { label: 'Record Payment', icon: IndianRupee, path: '/credit' },
    { label: 'AI Agronomist', icon: MessageSquare, path: '/ai-chat' },
    { label: 'View Analytics', icon: BarChart3, path: '/analytics' },
  ];

  const activityIcons = {
    registration: UserPlus,
    payment: IndianRupee,
    visit: Eye,
    sale: ShoppingBag,
    alert: AlertTriangle,
    credit: Wallet,
    ai: MessageSquare
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl text-[#1A3C2B] dark:text-[#F5F0E8]">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-[#4A5D52] dark:text-[#A0B0A7] mt-1">Here's your business overview for today</p>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-3.5 bg-[#D35400]/10 border border-[#D35400]/20 rounded-lg"
          data-testid="overdue-alert-banner"
        >
          <AlertTriangle className="w-5 h-5 text-[#D35400] flex-shrink-0" />
          <p className="text-sm text-[#D35400] font-medium flex-1">
            {overdue.length} farmer(s) have overdue payments totaling Rs {overdue.reduce((s, c) => s + (c.amount_due - (c.amount_paid || 0)), 0).toLocaleString('en-IN')}
          </p>
          <button
            onClick={() => navigate('/credit')}
            className="text-sm text-[#D35400] font-semibold hover:underline flex items-center gap-1"
            data-testid="view-overdue-btn"
          >
            View <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5 hover:-translate-y-px transition-transform duration-200"
              data-testid={`kpi-card-${i}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">{kpi.value}</p>
              <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7] mt-1">{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8] mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  data-testid={`quick-action-${action.label.toLowerCase().replace(/\s/g, '-')}`}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg hover:border-[#1A3C2B] dark:hover:border-[#D4A853] hover:-translate-y-px transition-all duration-200 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#1A3C2B]/10 dark:bg-[#D4A853]/10 flex items-center justify-center group-hover:bg-[#1A3C2B]/20">
                    <Icon className="w-4.5 h-4.5 text-[#1A3C2B] dark:text-[#D4A853]" />
                  </div>
                  <span className="text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-[#4A5D52] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8] mb-4">Recent Activity</h2>
          <div className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg divide-y divide-[#D8D3CB] dark:divide-[#2B4738]">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-[#4A5D52] dark:text-[#A0B0A7]" data-testid="empty-activity">
                No recent activity
              </div>
            ) : (
              activities.map((a, i) => {
                const Icon = activityIcons[a.type] || Clock;
                return (
                  <motion.div
                    key={i}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-3 p-4"
                    data-testid={`activity-item-${i}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EAE5DC] dark:bg-[#1E362A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#1A3C2B] dark:text-[#D4A853]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{a.message}</p>
                      <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7] mt-0.5">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" data-testid="dashboard-skeleton">
      <div className="h-10 w-64 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
        <div className="lg:col-span-2 h-64 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
      </div>
    </div>
  );
}
