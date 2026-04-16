import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import {
  Package, AlertTriangle, RefreshCw, IndianRupee,
  Plus, X, ChevronDown, ChevronUp, Search
} from 'lucide-react';

const STATUS_COLORS = {
  Healthy: 'bg-[#2E7D32]/10 text-[#2E7D32]',
  Low: 'bg-[#D4A853]/10 text-[#D4A853]',
  Reorder: 'bg-[#D35400]/10 text-[#D35400]'
};

const PROGRESS_COLORS = {
  Healthy: 'bg-[#2E7D32]',
  Low: 'bg-[#D4A853]',
  Reorder: 'bg-[#D35400]'
};

export default function Inventory() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Fertilizer', stock: '', price: '' });

  const fetchData = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get('/api/inventory'),
        api.get('/api/inventory/stats')
      ]);
      setProducts(p.data);
      setStats(s.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory', {
        name: form.name,
        category: form.category,
        stock: parseInt(form.stock),
        price: parseFloat(form.price)
      });
      addToast('Product added successfully');
      setShowModal(false);
      setForm({ name: '', category: 'Fertilizer', stock: '', price: '' });
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add product', 'error');
    }
  };

  const summaryCards = stats ? [
    { label: 'Total Products', value: stats.total_products, icon: Package, color: 'text-[#1A3C2B] dark:text-[#D4A853]', bg: 'bg-[#1A3C2B]/10 dark:bg-[#D4A853]/10' },
    { label: 'Low Stock', value: stats.low_stock, icon: AlertTriangle, color: 'text-[#D4A853]', bg: 'bg-[#D4A853]/10' },
    { label: 'Reorder Needed', value: stats.reorder_needed, icon: RefreshCw, color: 'text-[#D35400]', bg: 'bg-[#D35400]/10' },
    { label: 'Total Stock Value', value: `Rs ${stats.total_value.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-[#2E7D32]', bg: 'bg-[#2E7D32]/10' },
  ] : [];

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#1A3C2B] dark:text-[#F5F0E8]">Inventory</h1>
          <p className="text-[#4A5D52] dark:text-[#A0B0A7] text-sm mt-1">Product catalog & stock management</p>
        </div>
        {user?.role === 'dealer' && (
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-product-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A3C2B] hover:bg-[#142F21] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
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
              data-testid={`inventory-stat-${i}`}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D52]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          data-testid="inventory-search-input"
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-[#D8D3CB] dark:border-[#2B4738] bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50">
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Product</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Category</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Stock Level</th>
                <th className="text-left px-4 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Price</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#4A5D52] dark:text-[#A0B0A7]" data-testid="empty-inventory">
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <React.Fragment key={p.id}>
                    <tr
                      className="hover:bg-[#EAE5DC]/50 dark:hover:bg-[#1E362A]/50 transition-colors"
                      data-testid={`product-row-${p.id}`}
                    >
                      <td className="px-4 py-3 font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{p.name}</td>
                      <td className="px-4 py-3 text-[#4A5D52] dark:text-[#A0B0A7]">{p.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${PROGRESS_COLORS[p.status]}`}
                              style={{ width: `${Math.min((p.stock / (p.max_stock || 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">{p.stock}/{p.max_stock}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#0E1A14] dark:text-[#F5F0E8]">Rs {p.price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.variants?.length > 0 && (
                          <button
                            onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                            className="p-1 hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] rounded transition-colors"
                            data-testid={`expand-row-${p.id}`}
                          >
                            {expandedRow === p.id ? <ChevronUp className="w-4 h-4 text-[#4A5D52]" /> : <ChevronDown className="w-4 h-4 text-[#4A5D52]" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === p.id && p.variants?.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-[#EAE5DC]/30 dark:bg-[#1E362A]/30">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {p.variants.map((v, vi) => (
                              <div key={vi} className="px-3 py-2 bg-white dark:bg-[#14251D] rounded-lg border border-[#D8D3CB] dark:border-[#2B4738]">
                                <p className="text-xs font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{v.sku}</p>
                                <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">{v.weight || v.volume || v.area} &bull; Stock: {v.stock}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#14251D] rounded-xl border border-[#D8D3CB] dark:border-[#2B4738] w-full max-w-md shadow-2xl" data-testid="add-product-modal">
                <div className="flex items-center justify-between p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
                  <h3 className="font-serif text-xl text-[#1A3C2B] dark:text-[#F5F0E8]">Add Product</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#EAE5DC] dark:hover:bg-[#1E362A] rounded transition-colors">
                    <X className="w-5 h-5 text-[#4A5D52]" />
                  </button>
                </div>
                <form onSubmit={addProduct} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      data-testid="product-name-input"
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      data-testid="product-category-select"
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8]"
                    >
                      <option>Fertilizer</option>
                      <option>Seeds</option>
                      <option>Pesticide</option>
                      <option>Equipment</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Stock</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                        data-testid="product-stock-input"
                        className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8] mb-1">Price (Rs)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        data-testid="product-price-input"
                        className="w-full px-3 py-2.5 bg-white dark:bg-[#0E1A14] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg text-sm text-[#0E1A14] dark:text-[#F5F0E8] focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/20"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    data-testid="submit-product-btn"
                    className="w-full py-3 bg-[#1A3C2B] hover:bg-[#142F21] text-white font-medium rounded-lg transition-colors"
                  >
                    Add Product
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
