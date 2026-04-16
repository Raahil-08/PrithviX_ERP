import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import {
  User, Mail, Phone, MapPin, Building,
  Crown, Check, Users, Shield
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [p, sub] = await Promise.all([
          api.get('/api/settings/profile'),
          api.get('/api/settings/subscription')
        ]);
        setProfile(p.data);
        setSubscription(sub.data);
        if (user?.role === 'dealer') {
          const s = await api.get('/api/settings/staff');
          setStaff(s.data);
        }
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  if (loading) return (
    <div className="space-y-6 animate-pulse" data-testid="settings-skeleton">
      <div className="h-10 w-48 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
      <div className="h-64 bg-[#EAE5DC] dark:bg-[#1E362A] rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      <div>
        <h1 className="font-serif text-3xl text-[#1A3C2B] dark:text-[#F5F0E8]">Settings</h1>
        <p className="text-[#4A5D52] dark:text-[#A0B0A7] text-sm mt-1">Manage your account & preferences</p>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg"
        data-testid="settings-profile-section"
      >
        <div className="p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Dealer Profile</h3>
        </div>
        {profile && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-[#D8D3CB] dark:border-[#2B4738]">
              <div className="w-16 h-16 rounded-full bg-[#1A3C2B] flex items-center justify-center text-white text-2xl font-serif">
                {profile.name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">{profile.name}</h4>
                <p className="text-sm text-[#4A5D52] dark:text-[#A0B0A7] capitalize flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> {profile.role}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] dark:text-[#A0B0A7] mb-1 uppercase tracking-wider">Email</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                  <Mail className="w-4 h-4 text-[#4A5D52]" />
                  <span className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{profile.email || 'N/A'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] dark:text-[#A0B0A7] mb-1 uppercase tracking-wider">Phone</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                  <Phone className="w-4 h-4 text-[#4A5D52]" />
                  <span className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{profile.phone || 'N/A'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] dark:text-[#A0B0A7] mb-1 uppercase tracking-wider">Shop Name</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                  <Building className="w-4 h-4 text-[#4A5D52]" />
                  <span className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{profile.shop_name}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] dark:text-[#A0B0A7] mb-1 uppercase tracking-wider">Location</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#EAE5DC]/50 dark:bg-[#1E362A]/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-[#4A5D52]" />
                  <span className="text-sm text-[#0E1A14] dark:text-[#F5F0E8]">{profile.location}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Subscription */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg"
          data-testid="settings-subscription-section"
        >
          <div className="p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
            <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Subscription Plan</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#D4A853]/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#D4A853]" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-[#0E1A14] dark:text-[#F5F0E8]">{subscription.plan}</h4>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium bg-[#2E7D32]/10 text-[#2E7D32] rounded-full">{subscription.status}</span>
                  <span className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">Renews {subscription.renewal_date}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subscription.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#0E1A14] dark:text-[#F5F0E8]">
                  <Check className="w-4 h-4 text-[#2E7D32]" /> {f}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Staff Management */}
      {user?.role === 'dealer' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg"
          data-testid="settings-staff-section"
        >
          <div className="p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Staff Management</h3>
              <span className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">{staff.length} staff member(s)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="staff-table">
              <thead>
                <tr className="border-b border-[#D8D3CB] dark:border-[#2B4738] bg-[#EAE5DC]/30 dark:bg-[#1E362A]/30">
                  <th className="text-left px-5 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Username</th>
                  <th className="text-left px-5 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Phone</th>
                  <th className="text-left px-5 py-3 font-medium text-[#4A5D52] dark:text-[#A0B0A7]">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D3CB] dark:divide-[#2B4738]">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-[#4A5D52] dark:text-[#A0B0A7]">
                      No staff members yet
                    </td>
                  </tr>
                ) : (
                  staff.map((s, i) => (
                    <tr key={i} className="hover:bg-[#EAE5DC]/50 dark:hover:bg-[#1E362A]/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#0E1A14] dark:text-[#F5F0E8]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1A3C2B]/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-[#1A3C2B] dark:text-[#D4A853]" />
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#4A5D52] dark:text-[#A0B0A7]">{s.username || '-'}</td>
                      <td className="px-5 py-3 text-[#4A5D52] dark:text-[#A0B0A7]">{s.phone || '-'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium bg-[#1A3C2B]/10 text-[#1A3C2B] dark:bg-[#D4A853]/10 dark:text-[#D4A853] rounded-full capitalize">{s.role}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Operational Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#14251D] border border-[#D8D3CB] dark:border-[#2B4738] rounded-lg"
        data-testid="settings-toggles-section"
      >
        <div className="p-5 border-b border-[#D8D3CB] dark:border-[#2B4738]">
          <h3 className="font-serif text-lg text-[#1A3C2B] dark:text-[#F5F0E8]">Operational Settings</h3>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Enable Credit/Udhaar', desc: 'Allow credit-based sales to farmers', defaultOn: true },
            { label: 'SMS Notifications', desc: 'Send SMS alerts for overdue payments', defaultOn: false },
            { label: 'Auto-generate Reports', desc: 'Weekly analytics reports via email', defaultOn: true },
            { label: 'AI Recommendations', desc: 'Enable AI-powered product suggestions', defaultOn: true },
          ].map((toggle, i) => (
            <ToggleRow key={i} {...toggle} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  const { addToast } = useToast();
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-[#0E1A14] dark:text-[#F5F0E8]">{label}</p>
        <p className="text-xs text-[#4A5D52] dark:text-[#A0B0A7]">{desc}</p>
      </div>
      <button
        onClick={() => { setOn(!on); addToast(`${label} ${!on ? 'enabled' : 'disabled'}`); }}
        data-testid={`toggle-${label.toLowerCase().replace(/[\s\/]/g, '-')}`}
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-[#2E7D32]' : 'bg-[#D8D3CB] dark:bg-[#2B4738]'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
