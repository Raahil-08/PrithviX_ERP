import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Search, Filter, X, Phone, MapPin, Star,
  Eye, IndianRupee, ChevronRight, Calendar,
  FileText, Send
} from 'lucide-react';

const LOYALTY_COLORS = {
  Gold: 'bg-[#D4A853]/20 text-[#B88E3B] border-[#D4A853]/30',
  Silver: 'bg-gray-200 text-gray-600 border-gray-300',
  Bronze: 'bg-orange-100 text-orange-600 border-orange-200'
};

const CREDIT_COLORS = {
  Clear: 'bg-[#2E7D32]/10 text-[#2E7D32]',
  Due: 'bg-[#D4A853]/10 text-[#D4A853]',
  Overdue: 'bg-[#D35400]/10 text-[#D35400]'
};

const AVATARS = [
  'https://images.unsplash.com/photo-1614025000673-edf238aaf5d4?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1606203452426-f5af98e6f96e?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1609252509102-aa73ff792667?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1632923057240-b6775e4db748?w=100&h=100&fit=crop'
];

export default function Farmers() {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ crop_cycle: '', loyalty: '', credit_status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [newNote, setNewNote] = useState('');

  const fetchFarmers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.crop_cycle) params.set('crop_cycle', filters.crop_cycle);
      if (filters.loyalty) params.set('loyalty', filters.loyalty);
      if (filters.credit_status) params.set('credit_status', filters.credit_status);
      const res = await api.get(`/api/farmers?${params}`);
      setFarmers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchFarmers(); }, [search, filters]);

  const openDetail = async (farmer) => {
    setSelected(farmer);
    try {
      const res = await api.get(`/api/farmers/${farmer.id}`);
      setDetail(res.data);
    } catch {}
  };

  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    try {
      await api.post(`/api/farmers/${selected.id}/notes`, { note: newNote });
      setNewNote('');
      const res = await api.get(`/api/farmers/${selected.id}`);
      setDetail(res.data);
    } catch {}
  };

  return (
    <div className="space-y-6" data-testid="farmers-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#1A3C2B] dark:text-[#F5F0E8]">Farmer Management</h1>
          <p className="text-[#4A5D52] dark:text-[#A0B0A7] text-sm mt-1">{farmers.length} farmers registered</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D52]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search farmers by name, village, or mobile..."
            data-testid="farmer-search-input"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          data-testid="farmer-filter-toggle"
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
            showFilters ? 'bg-[#1A3C2B] text-white border-[#1A3C2B]' : 'bg-white dark:bg-[#14251D] border-[#D8D3CB] dark:border-[#2B4738] text-[#0E1A14] dark:text-[#F5F0E8]'
          }`}
        >
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3"
        >
          <select
            value={filters.crop_cycle}
            onChange={e => setFilters(p => ({ ...p, crop_cycle: e.target.value }))}
            data-testid="filter-crop-cycle"
            className="px-3 py-2 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8]"
          >
            <option value="">All Crop Cycles</option>
            <option value="Kharif">Kharif</option>
            <option value="Rabi">Rabi</option>
          </select>
          <select
            value={filters.loyalty}
            onChange={e => setFilters(p => ({ ...p, loyalty: e.target.value }))}
            data-testid="filter-loyalty"
            className="px-3 py-2 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8]"
          >
            <option value="">All Tiers</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>
          <select
            value={filters.credit_status}
            onChange={e => setFilters(p => ({ ...p, credit_status: e.target.value }))}
            data-testid="filter-credit-status"
            className="px-3 py-2 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8]"
          >
            <option value="">All Credit Status</option>
            <option value="Clear">Clear</option>
            <option value="Due">Due</option>
            <option value="Overdue">Overdue</option>
          </select>
          <button
            onClick={() => setFilters({ crop_cycle: '', loyalty: '', credit_status: '' })}
            className="px-3 py-2 text-sm text-[#D35400] hover:bg-[#D35400]/10 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="farmers-table">
            <thead>
              <tr className="border-b border-[#D8D3CB] dark:border-[#2B4738] bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50">
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Farmer</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7] hidden sm:table-cell">Village</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7] hidden md:table-cell">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Loyalty</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7] hidden lg:table-cell">Visits</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Outstanding</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Credit</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D3CB] dark:divide-[#2B4738]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 w-20 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 w-28 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 w-8 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-[#EAE5DC] dark:bg-[#1E362A] rounded" /></td>
                  </tr>
                ))
              ) : farmers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#4A5D52] dark:text-[#A0B0A7]" data-testid="empty-farmers">
                    No farmers found matching your criteria
                  </td>
                </tr>
              ) : (
                farmers.map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => openDetail(f)}
                    className="hover:bg-[#EAE5DC]/50 dark:hover:bg-[#1E362A]/50 cursor-pointer transition-colors"
                    data-testid={`farmer-row-${f.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={AVATARS[f.avatar_idx || 0]}
                          alt={f.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#4A5D52] dark:text-[#A0B0A7] hidden sm:table-cell">{f.village}</td>
                    <td className="px-4 py-3 text-[#4A5D52] dark:text-[#A0B0A7] hidden md:table-cell">{f.mobile}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${LOYALTY_COLORS[f.loyalty_tier]}`}>
                        <Star className="w-3 h-3" /> {f.loyalty_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#0E1A14] dark:text-[#F5F0E8] hidden lg:table-cell">{f.total_visits}</td>
                    <td className="px-4 py-3 font-medium text-[#0E1A14] dark:text-[#F5F0E8]">
                      {f.outstanding > 0 ? `Rs ${f.outstanding.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${CREDIT_COLORS[f.credit_status]}`}>
                        {f.credit_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-[#4A5D52]" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => { setSelected(null); setDetail(null); }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-[#14251D] z-50 shadow-2xl overflow-y-auto"
              data-testid="farmer-detail-drawer"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-[#14251D] border-b border-[#D8D3CB] dark:border-[#2B4738] p-4 flex items-center justify-between z-10">
                <h2 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8]">Farmer Profile</h2>
                <button
                  onClick={() => { setSelected(null); setDetail(null); }}
                  data-testid="close-farmer-drawer"
                  className="p-2 hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#4A5D52]" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <img
                    src={AVATARS[selected.avatar_idx || 0]}
                    alt={selected.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">{selected.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${LOYALTY_COLORS[selected.loyalty_tier]}`}>
                        <Star className="w-3 h-3" /> {selected.loyalty_tier}
                      </span>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${CREDIT_COLORS[selected.credit_status]}`}>
                        {selected.credit_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-[#4A5D52] dark:text-[#A0B0A7]">
                    <MapPin className="w-4 h-4" /> {selected.village}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#4A5D52] dark:text-[#A0B0A7]">
                    <Phone className="w-4 h-4" /> {selected.mobile}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#4A5D52] dark:text-[#A0B0A7]">
                    <Eye className="w-4 h-4" /> {selected.total_visits} visits
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#4A5D52] dark:text-[#A0B0A7]">
                    <IndianRupee className="w-4 h-4" /> Rs {(selected.outstanding || 0).toLocaleString('en-IN')} due
                  </div>
                </div>

                {/* Visit History */}
                <div>
                  <h4 className="font-semibold text-[#0E1A14] dark:text-[#F5F0E8] mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Visit History
                  </h4>
                  {detail?.visits?.length ? (
                    <div className="space-y-2">
                      {detail.visits.map((v, i) => (
                        <div key={i} className="p-3 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#1A3C2B] dark:text-[#D4A853]">{v.type}</span>
                            <span className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">
                              {v.date ? new Date(v.date).toLocaleDateString('en-IN') : ''}
                            </span>
                          </div>
                          <p className="text-sm text-[#0E1A14] dark:text-[#F5F0E8] mt-1">{v.notes}</p>
                          {v.amount > 0 && (
                            <p className="text-sm font-medium text-[#2E7D32] mt-1">Rs {v.amount.toLocaleString('en-IN')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#4A5D52] dark:text-[#A0B0A7]">No visit history</p>
                  )}
                </div>

                {/* Credit Ledger */}
                <div>
                  <h4 className="font-semibold text-[#0E1A14] dark:text-[#F5F0E8] mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Credit Ledger
                  </h4>
                  {detail?.credits?.length ? (
                    <div className="space-y-2">
                      {detail.credits.map((c, i) => (
                        <div key={i} className="p-3 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8]">Rs {c.amount_due?.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">{c.days_overdue} days overdue</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.status === 'Overdue' ? 'bg-[#D35400]/10 text-[#D35400]' : 'bg-[#D4A853]/10 text-[#D4A853]'}`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#4A5D52] dark:text-[#A0B0A7]">No credit records</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-semibold text-[#0E1A14] dark:text-[#F5F0E8] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Notes
                  </h4>
                  {detail?.notes?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {detail.notes.map((n, i) => (
                        <div key={i} className="p-3 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                          <p className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{n.note}</p>
                          <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7] mt-1">
                            {n.created_by} &bull; {n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN') : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {user?.role === 'dealer' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Add a note..."
                        data-testid="farmer-note-input"
                        className="flex-1 px-3 py-2 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] placeholder:text-[#4A5D52]/50"
                        onKeyDown={e => e.key === 'Enter' && addNote()}
                      />
                      <button
                        onClick={addNote}
                        data-testid="add-note-btn"
                        className="p-2 bg-[#1A3C2B] text-white rounded-lg hover:bg-[#142F21] transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
