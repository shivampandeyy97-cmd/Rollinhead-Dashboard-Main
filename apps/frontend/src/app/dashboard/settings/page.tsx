'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/auth';
import { api } from '../../../lib/api';
import { Loader2, Settings, Lock, CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, Building2, User, Mail } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Form states - profile
  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(user?.publisher?.companyName || '');
  const [contactEmail, setContactEmail] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');

  // Form states - security
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback notifications
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch full details on load once to pre-fill
  const [loaded, setLoaded] = useState(false);
  if (!loaded && user?.role === 'PUBLISHER' && user?.id) {
    api.get(`/publishers/${user.publisher?.id}`)
      .then((pub) => {
        setCompanyName(pub.companyName);
        setContactEmail(pub.contactEmail);
        setPaymentDetails(pub.paymentDetails);
        setLoaded(true);
      })
      .catch((e) => {
        console.error('Failed to prefill publisher details:', e);
        setLoaded(true);
      });
  } else if (!loaded) {
    setLoaded(true);
  }

  // Update profile mutation
  const profileMutation = useMutation({
    mutationFn: (data: { name: string; companyName?: string; contactEmail?: string; paymentDetails?: string }) => 
      api.patch('/auth/profile', data),
    onSuccess: async () => {
      setProfileFeedback({ type: 'success', text: 'Account profile details updated successfully!' });
      await checkAuth(); // Sync Zustand state
      queryClient.invalidateQueries({ queryKey: ['websites-list'] });
    },
    onError: (err: any) => {
      setProfileFeedback({ type: 'error', text: err.message || 'Failed to update profile' });
    },
  });

  // Change password mutation
  const securityMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/change-password', data),
    onSuccess: () => {
      setSecurityFeedback({ type: 'success', text: 'Account password changed successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      setSecurityFeedback({ type: 'error', text: err.message || 'Failed to update password' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const payload: any = { name };
    if (user?.role === 'PUBLISHER') {
      payload.companyName = companyName;
      payload.contactEmail = contactEmail;
      payload.paymentDetails = paymentDetails;
    }

    profileMutation.mutate(payload);
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    if (newPassword !== confirmPassword) {
      setSecurityFeedback({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setSecurityFeedback({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    securityMutation.mutate({ oldPassword, newPassword });
  };

  const isPublisher = user?.role === 'PUBLISHER';

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Settings className="h-6 w-6 text-[#e50914]" />
          <span>Account Settings</span>
        </h2>
        <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
          Manage your payment details, company profile, and password security configs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Card */}
        <div className="glass rounded-xl p-6 relative overflow-hidden bg-white border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Building2 className="h-4.5 w-4.5 text-[#e50914]" />
            <span>Profile & Payment Channels</span>
          </h3>

          {profileFeedback && (
            <div className={`mb-4 p-3.5 rounded-lg border text-xs font-semibold flex items-start space-x-2 ${
              profileFeedback.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {profileFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
              )}
              <span>{profileFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Owner / Contact Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Login Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user?.email}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-400 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none shadow-sm cursor-not-allowed"
                />
              </div>
            </div>

            {isPublisher && (
              <>
                <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                  <p className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest mb-2">Publisher Corporate Settings</p>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Billing Contact Email</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center space-x-1">
                      <CreditCard className="h-3.5 w-3.5 text-[#e50914]" />
                      <span>Bank Payment Details</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="IBAN SWIFT / PayPal channel details"
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2.5 px-3 text-xs focus:outline-none transition-all shadow-sm"
                    />
                    <p className="text-[9px] text-slate-400 font-semibold mt-1">
                      * Required to schedule Net payouts. Admin ops can override if incorrect.
                    </p>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="mt-6 w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer hover:shadow-md transition-all flex items-center justify-center space-x-1"
            >
              {profileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Account Settings</span>
            </button>

          </form>
        </div>

        {/* Security Card */}
        <div className="glass rounded-xl p-6 relative overflow-hidden bg-white border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Lock className="h-4.5 w-4.5 text-[#e50914]" />
            <span>Security & Passwords</span>
          </h3>

          {securityFeedback && (
            <div className={`mb-4 p-3.5 rounded-lg border text-xs font-semibold flex items-start space-x-2 ${
              securityFeedback.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {securityFeedback.type === 'success' ? (
                <ShieldCheck className="h-4.5 w-4.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
              )}
              <span>{securityFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSecuritySubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Current Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-[#e50914] text-slate-900 rounded-lg py-2 px-3 text-xs focus:outline-none transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={securityMutation.isPending}
              className="mt-6 w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer hover:bg-slate-900 transition-all flex items-center justify-center space-x-1"
            >
              {securityMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Change Password</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
