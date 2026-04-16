import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BarChart3, TrendingUp, Map as MapIcon } from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CHART_COLORS = ['#1A3C2B', '#D4A853', '#2E7D32', '#D35400', '#4A5D52'];
const PIE_COLORS = ['#1A3C2B', '#D4A853', '#2E7D32', '#D35400'];

const periods = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All Time' },
];

export default function Analytics() {
  const [sales, setSales] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [collections, setCollections] = useState(null);
  const [invBreakdown, setInvBreakdown] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [period, setPeriod] = useState('month');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/analytics/sales?period=${period}`),
      api.get('/api/analytics/farmer-growth'),
      api.get('/api/analytics/collections'),
      api.get('/api/analytics/inventory-breakdown'),
      api.get('/api/analytics/map-data')
    ]).then(([s, g, c, ib, m]) => {
      setSales(s.data);
      setGrowth(g.data);
      setCollections(c.data);
      setInvBreakdown(ib.data);
      setMapData(m.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const filteredSales = useMemo(() => {
    if (period === 'all') return sales;
    const days = period === 'week' ? 7 : 30;
    return sales.slice(-days);
  }, [sales, period]);

  const chartSales = useMemo(() => {
    return filteredSales.map(s => ({
      ...s,
      date: s.date ? new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''
    }));
  }, [filteredSales]);

  const donutData = collections ? [
    { name: 'Collected', value: collections.collected },
    { name: 'Pending', value: collections.pending }
  ] : [];

  if (loading) return (
    <div className="space-y-6 animate-pulse" data-testid="analytics-skeleton">
      <div className="h-10 w-48 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
        <div className="h-80 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="font-serif text-3xl text-[#1A3C2B] dark:text-[#F5F0E8]">Analytics</h1>
        <p className="text-[#4A5D52] dark:text-[#A0B0A7] text-sm mt-1">Business insights & performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5"
          data-testid="sales-chart-container"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Sales Revenue</h3>
            <div className="flex items-center gap-2">
              {/* Chart type toggle */}
              <div className="flex bg-[#EAE5DC] dark:bg-[#1E362A] p-0.5 rounded-md">
                <button
                  onClick={() => setChartType('line')}
                  data-testid="chart-type-line"
                  className={`p-1.5 rounded ${chartType === 'line' ? 'bg-white dark:bg-[#14251D] shadow-sm' : ''}`}
                >
                  <TrendingUp className="w-4 h-4 text-[#4A5D52]" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  data-testid="chart-type-bar"
                  className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-white dark:bg-[#14251D] shadow-sm' : ''}`}
                >
                  <BarChart3 className="w-4 h-4 text-[#4A5D52]" />
                </button>
              </div>
              {/* Period tabs */}
              <div className="flex bg-[#EAE5DC] dark:bg-[#1E362A] p-0.5 rounded-md">
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    data-testid={`period-${p.key}`}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      period === p.key
                        ? 'bg-white dark:bg-[#14251D] text-[#1A3C2B] dark:text-[#F5F0E8] shadow-sm'
                        : 'text-[#4A5D52]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {chartType === 'line' ? (
              <LineChart data={chartSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D3CB" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4A5D52' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4A5D52' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #D8D3CB', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#1A3C2B" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D3CB" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4A5D52' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4A5D52' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #D8D3CB', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#1A3C2B" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Farmer Growth */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5"
          data-testid="farmer-growth-chart"
        >
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8] mb-4">Farmer Growth Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D3CB" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4A5D52' }} />
              <YAxis tick={{ fontSize: 11, fill: '#4A5D52' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #D8D3CB', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#D4A853" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Collection Rate */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5"
          data-testid="collection-chart"
        >
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8] mb-4">Collection Rate</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  <Cell fill="#2E7D32" />
                  <Cell fill="#D8D3CB" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {collections && (
            <div className="flex justify-center gap-6 mt-2">
              <div className="text-center">
                <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">Total Due</p>
                <p className="text-sm font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">Rs {collections.total_due.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">Total Paid</p>
                <p className="text-sm font-semibold text-[#2E7D32]">Rs {collections.total_paid.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Inventory Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5"
          data-testid="inventory-breakdown-chart"
        >
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8] mb-4">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={invBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                nameKey="category"
                label={({ category, value }) => `${category}: Rs ${(value/1000).toFixed(0)}K`}
              >
                {invBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `Rs ${value.toLocaleString('en-IN')}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg p-5"
        data-testid="analytics-map-container"
      >
        <div className="flex items-center gap-2 mb-4">
          <MapIcon className="w-5 h-5 text-[#1A3C2B] dark:text-[#D4A853]" />
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Farmer Locations</h3>
        </div>
        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={[20.1, 73.8]}
            zoom={9}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            {mapData.map((f, i) => (
              <Marker key={i} position={[f.lat, f.lng]}>
                <Popup>
                  <div className="font-sans">
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.village} &bull; {f.crop_cycle}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </motion.div>
    </div>
  );
}
