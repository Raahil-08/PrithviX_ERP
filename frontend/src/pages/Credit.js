import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import {
  IndianRupee, AlertTriangle, Clock, TrendingDown,
  X, CreditCard, Banknote
} from 'lucide-react';

export default function Credit() {
  const { addToast } = useToast();
  const [credits, setCredits] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', note: '' });

  const fetchData = async () => {
    try {
      const [c, s] = await Promise.all([
        api.get(`/api/credits?tab=${tab}`),
        api.get('/api/credits/stats')
      ]);
      setCredits(c.data);
      setStats(s.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal) return;
    try {
      await api.post('/api/credits/payment', {
        farmer_id: paymentModal.farmer_id,
        amount: parseFloat(payForm.amount),
        mode: payForm.mode,
        note: payForm.note
      });
      addToast(`Payment of Rs ${payForm.amount} recorded successfully`);
      setPaymentModal(null);
      setPayForm({ amount: '', mode: 'Cash', note: '' });
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to record payment', 'error');
    }
  };

  const summaryCards = stats ? [
    { label: 'Total Exposure', value: `Rs ${stats.total_exposure.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-[#D35400]', bg: 'bg-[#D35400]/10' },
    { label: 'Overdue Count', value: stats.overdue_count, icon: AlertTriangle, color: 'text-[#D35400]', bg: 'bg-[#D35400]/10' },
    { label: 'Collections (Week)', value: `Rs ${stats.collections_week.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-[#2E7D32]', bg: 'bg-[#2E7D32]/10' },
    { label: 'Avg. Delay (Days)', value: `${stats.average_delay} days`, icon: TrendingDown, color: 'text-[#D4A853]', bg: 'bg-[#D4A853]/10' },
  ] : [];

  return (
    <div className="space-y-6" data-testid="credit-page">
      <div>
        <h1 className="font-serif text-3xl text-[#1A3C2B] dark:text-[#F5F0E8]">Udhaar / Credit</h1>
        <p className="text-[#4A5D52] dark:text-[#A0B0A7] text-sm mt-1">Credit management & payment tracking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-4"
              data-testid={`credit-stat-${i}`}
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <p className="text-xl font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">{card.value}</p>
              <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7] mt-0.5">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EAE5DC] dark:bg-[#1E362A] p-1 rounded-lg w-fit" data-testid="credit-tabs">
        {[
          { key: 'all', label: 'All Credits' },
          { key: 'overdue', label: 'Overdue (30+ days)' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`credit-tab-${t.key}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white dark:bg-[#14251D] text-[#1A3C2B] dark:text-[#F5F0E8] shadow-sm'
                : 'text-[#4A5D52] dark:text-[#A0B0A7] hover:text-[#0E1A14] dark:hover:text-[#F5F0E8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Credit List */}
      <div className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="credit-table">
            <thead>
              <tr className="border-b border-[#D8D3CB] dark:border-[#2B4738] bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50">
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Farmer</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Amount Due</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Paid</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7] hidden sm:table-cell">Days Overdue</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D3CB] dark:divide-[#2B4738]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 w-20 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : credits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#4A5D52] dark:text-[#A0B0A7]" data-testid="empty-credits">
                    {tab === 'overdue' ? 'No overdue credits' : 'No credit records found'}
                  </td>
                </tr>
              ) : (
                credits.map((c, i) => (
                  <tr
                    key={i}
                    className="hover:bg-[#EAE5DC]/50 dark:hover:bg-[#1E362A]/50 transition-colors"
                    data-testid={`credit-row-${i}`}
                  >
                    <td className="px-4 py-3 font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{c.farmer_name}</td>
                    <td className="px-4 py-3 font-semibold text-[#D35400]">Rs {c.amount_due.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-[#2E7D32]">Rs {(c.amount_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#4A5D52]" />
                        <span className={`text-sm ${c.days_overdue >= 30 ? 'text-[#D35400] font-medium' : 'text-[#4A5D52] dark:text-[#A0B0A7]'}`}>
                          {c.days_overdue}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        c.status === 'Overdue' ? 'bg-[#D35400]/10 text-[#D35400]' : 'bg-[#D4A853]/10 text-[#D4A853]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPaymentModal(c)}
                        data-testid={`record-payment-btn-${i}`}
                        className="px-3 py-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32] text-xs font-medium rounded-lg transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setPaymentModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#14251D] rounded-xl border border-[#D8D3CB] dark:border-[#2B4738] w-full max-w-md shadow-2xl" data-testid="payment-modal">
                <div className="flex items-center justify-between p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
                  <div>
                    <h3 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8]">Record Payment</h3>
                    <p className="text-sm text-[#4A5D52] dark:text-[#A0B0A7]">{paymentModal.farmer_name}</p>
                  </div>
                  <button onClick={() => setPaymentModal(null)} className="p-1 hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] rounded">
                    <X className="w-5 h-5 text-[#4A5D52]" />
                  </button>
                </div>
                <form onSubmit={recordPayment} className="p-5 space-y-4">
                  <div className="p-3 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                    <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">Outstanding Amount</p>
                    <p className="text-lg font-semibold text-[#D35400]">
                      Rs {(paymentModal.amount_due - (paymentModal.amount_paid || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Amount (Rs)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={payForm.amount}
                      onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                      data-testid="payment-amount-input"
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Payment Mode</label>
                    <div className="flex gap-2">
                      {[{ key: 'Cash', icon: Banknote }, { key: 'UPI', icon: CreditCard }].map(m => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPayForm(f => ({ ...f, mode: m.key }))}
                          data-testid={`payment-mode-${m.key.toLowerCase()}`}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                            payForm.mode === m.key
                              ? 'bg-[#1A3C2B] text-white border-[#1A3C2B]'
                              : 'bg-white dark:bg-[#0E1A14] border-[#D8D3CB] dark:border-[#2B4738] text-[#0E1A14] dark:text-[#F5F0E8]'
                          }`}
                        >
                          <m.icon className="w-4 h-4" /> {m.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={payForm.note}
                      onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Payment reference or note"
                      data-testid="payment-note-input"
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
                    />
                  </div>
                  <button
                    type="submit"
                    data-testid="submit-payment-btn"
                    className="w-full py-3 bg-[#2E7D32] hover:bg-[#256829] text-white font-medium rounded-lg transition-colors"
                  >
                    Record Payment
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
