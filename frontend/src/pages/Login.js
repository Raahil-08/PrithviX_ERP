import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Wheat, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [tab, setTab] = useState('dealer');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (tab === 'dealer' && !email) return setError('Email is required');
    if (tab === 'staff' && !username) return setError('Username is required');
    if (!password) return setError('Password is required');

    setLoading(true);
    try {
      const payload = tab === 'dealer'
        ? { email, password }
        : { username, password };
      await login(payload);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      else setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1759155895472-c4fd4716b158?w=1200&q=80"
          alt="Agriculture field"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A3C2B]/80 via-[#1A3C2B]/60 to-[#0E1A14]/70" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <p className="text-[#D4A853] text-sm font-medium tracking-widest uppercase mb-3">Agricultural Intelligence</p>
            <h1 className="font-serif text-5xl text-white leading-tight mb-4">
              Powering Rural<br />Commerce
            </h1>
            <p className="text-white/70 text-lg max-w-md leading-relaxed">
              The AI-powered dealer management platform for agricultural input distributors across rural India.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F0E8] p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-12 h-12 rounded-xl bg-[#1A3C2B] flex items-center justify-center"
            >
              <Wheat className="w-7 h-7 text-[#D4A853]" />
            </motion.div>
            <div>
              <h2 className="font-serif text-2xl text-[#1A3C2B]">Prithvix</h2>
              <p className="text-xs text-[#4A5D52] tracking-wider uppercase">Dealer Management</p>
            </div>
          </div>

          <h3 className="font-serif text-3xl text-[#0E1A14] mb-2">Welcome back</h3>
          <p className="text-[#4A5D52] mb-8">Sign in to your dashboard</p>

          {/* Tabs */}
          <div className="flex bg-[#EAE5DC] rounded-lg p-1 mb-8" data-testid="login-tabs">
            {['dealer', 'staff'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                data-testid={`login-tab-${t}`}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                  tab === t
                    ? 'bg-white text-[#1A3C2B] shadow-sm'
                    : 'text-[#4A5D52] hover:text-[#0E1A14]'
                }`}
              >
                {t} Login
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {tab === 'dealer' ? (
              <div>
                <label className="block text-sm font-medium text-[#0E1A14] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="dealer@prithvix.com"
                  data-testid="login-email-input"
                  className="w-full px-4 py-3 bg-white border border-[#D8D3CB] rounded-lg text-[#0E1A14] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/30 focus:border-[#1A3C2B] transition-all"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#0E1A14] mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="staff01"
                  data-testid="login-username-input"
                  className="w-full px-4 py-3 bg-white border border-[#D8D3CB] rounded-lg text-[#0E1A14] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/30 focus:border-[#1A3C2B] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0E1A14] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="login-password-input"
                  className="w-full px-4 py-3 bg-white border border-[#D8D3CB] rounded-lg text-[#0E1A14] placeholder:text-[#4A5D52]/50 focus:outline-none focus:ring-2 focus:ring-[#1A3C2B]/30 focus:border-[#1A3C2B] transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D52] hover:text-[#0E1A14] transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[#D35400] bg-[#D35400]/10 px-3 py-2 rounded-lg"
                data-testid="login-error-message"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full py-3.5 bg-[#1A3C2B] hover:bg-[#142F21] text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-[#4A5D52] mt-8">
            Demo: dealer@prithvix.com / dealer123 &bull; staff01 / staff123
          </p>
        </motion.div>
      </div>
    </div>
  );
}
