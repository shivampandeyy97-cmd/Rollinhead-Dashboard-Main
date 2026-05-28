'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { Loader2, UserPlus, Edit3, Key, Percent, ShieldCheck, CheckCircle2, AlertTriangle, Eye, X } from 'lucide-react';
import { PaymentCycle, PublisherStatus } from '@rollinhead/types';





export default function AdminPublishersPage() {
  const queryClient = useQueryClient();

  // Queries all publishers
  const { data: publishers, isLoading, error } = useQuery({
    queryKey: ['admin-publishers'],
    queryFn: () => api.get('/publishers'),
    retry: false,
  });

  const useMock = error || !publishers || publishers.length === 0;

  // Mock fallbacks
  const mockPublishers = [
    {
      id: 'pub-1',
      companyName: 'TechMedia Group LLC',
      contactEmail: 'billing@techmedia.com',
      paymentDetails: 'Bank Transfer IBAN DE1234...',
      paymentCycle: 'NET_30',
      status: 'ACTIVE',
      user: { name: 'TechMedia Owner', email: 'publisher@rollinhead.com', isActive: true, lastLoginAt: new Date().toISOString() },
      websites: [{ domain: 'techblog.com' }],
      revenueShareConfigs: [{ sharePercentage: 80.00 }],
    },
    {
      id: 'pub-2',
      companyName: 'SportsHub Networks',
      contactEmail: 'accounts@sportshub.net',
      paymentDetails: 'PayPal: pay@sportshub.net',
      paymentCycle: 'NET_15',
      status: 'PENDING',
      user: { name: 'Sports Admin', email: 'sports@demo.com', isActive: true, lastLoginAt: null },
      websites: [{ domain: 'sportshub.net' }],
      revenueShareConfigs: [{ sharePercentage: 75.00 }],
    },
  ];

  const currentPublishers = useMock ? mockPublishers : publishers;

  // Modals state
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'rev-share' | 'password' | null>(null);
  const [selectedPub, setSelectedPub] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [paymentCycle, setPaymentCycle] = useState('NET_30');
  const [status, setStatus] = useState('ACTIVE');
  const [sharePercentage, setSharePercentage] = useState('80');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Publisher onboarded successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
      clearForms();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/publishers/${selectedPub.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Publisher updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
  });

  const revShareMutation = useMutation({
    mutationFn: (data: any) => api.post(`/publishers/${selectedPub.id}/rev-share`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Revenue share percentage updated!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.post(`/publishers/${selectedPub.id}/reset-password`, data),
    onSuccess: () => {
      setFeedback('Password reset successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
  });

  const clearForms = () => {
    setEmail('');
    setName('');
    setPassword('');
    setCompanyName('');
    setContactEmail('');
    setPaymentDetails('');
  };

  const handleOpenEdit = (pub: any) => {
    setSelectedPub(pub);
    setCompanyName(pub.companyName);
    setContactEmail(pub.contactEmail);
    setPaymentDetails(pub.paymentDetails);
    setPaymentCycle(pub.paymentCycle);
    setStatus(pub.status);
    setName(pub.user?.name || '');
    setActiveModal('edit');
  };

  const handleOpenRevShare = (pub: any) => {
    setSelectedPub(pub);
    setSharePercentage(pub.revenueShareConfigs?.[0]?.sharePercentage?.toString() || '80');
    setActiveModal('rev-share');
  };

  const handleOpenPassword = (pub: any) => {
    setSelectedPub(pub);
    setPassword('');
    setActiveModal('password');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Publisher Directory</h2>
          <p className="text-xs text-gray-400 font-semibold tracking-wide mt-1">
            {useMock 
              ? '✨ Demonstration Mode (Database starting up)' 
              : 'Add, approve, and manage adtech publisher partners and revenue configurations'}
          </p>
        </div>

        <button
          onClick={() => {
            clearForms();
            setActiveModal('create');
          }}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] text-white px-5 py-3 rounded-lg text-xs font-black transition-all cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444] self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Onboard New Publisher</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-lg bg-green-950/20 border border-green-800/30 text-[#4ade80] text-sm font-bold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="h-5 w-5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#16181c] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registered Publishers</h3>
          <ShieldCheck className="h-5 w-5 text-gray-500" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a1c20] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Owner Account</th>
                <th className="px-6 py-4">Share %</th>
                <th className="px-6 py-4">Cycle</th>
                <th className="px-6 py-4">Websites</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16181c] text-xs font-semibold">
              {currentPublishers.map((pub: any) => {
                const activeShare = pub.revenueShareConfigs?.[0]?.sharePercentage || 80.00;
                const websiteCount = pub.websites?.length || 0;

                return (
                  <tr key={pub.id} className="hover:bg-[#121318] transition-all">
                    <td className="px-6 py-4 font-bold text-white">
                      <div>{pub.companyName}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{pub.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div>{pub.user?.name}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{pub.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-[#e50914] font-black text-sm">{activeShare}%</td>
                    <td className="px-6 py-4 text-gray-400">{pub.paymentCycle}</td>
                    <td className="px-6 py-4 text-gray-400">{websiteCount} sites</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        pub.status === 'ACTIVE'
                          ? 'bg-green-950/20 border-green-800/30 text-[#4ade80]'
                          : pub.status === 'PENDING'
                          ? 'bg-yellow-950/20 border-yellow-800/30 text-[#facc15]'
                          : 'bg-red-950/20 border-red-800/30 text-[#f87171]'
                      }`}>
                        {pub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      
                      {/* Edit Profile */}
                      <button
                        onClick={() => handleOpenEdit(pub)}
                        className="p-2 bg-[#16181c] border border-[#21242e] text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer focus:outline-none"
                        title="Edit Publisher"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Revenue Share */}
                      <button
                        onClick={() => handleOpenRevShare(pub)}
                        className="p-2 bg-[#16181c] border border-[#21242e] text-gray-400 hover:text-[#e50914] rounded-lg transition-all cursor-pointer focus:outline-none"
                        title="Configure Share %"
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => handleOpenPassword(pub)}
                        className="p-2 bg-[#16181c] border border-[#21242e] text-gray-400 hover:text-yellow-400 rounded-lg transition-all cursor-pointer focus:outline-none"
                        title="Reset Account Password"
                      >
                        <Key className="h-3.5 w-3.5" />
                      </button>

                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modals Dialogs --- */}
      
      {/* 1. Onboard / Create Modal */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg glass glass-red rounded-2xl p-6 relative animate-fade-in">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white tracking-tight mb-4 flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-[#e50914]" />
              <span>Onboard Partner Publisher</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ email, name, password, companyName, contactEmail, paymentDetails });
            }} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Tech LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billing Contact Email</label>
                  <input
                    type="email"
                    placeholder="billing@tech.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">User / Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Login Email</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@tech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Login Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bank Payment details</label>
                <input
                  type="text"
                  placeholder="IBAN / Swift / PayPal"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
              >
                {createMutation.isPending ? 'Onboarding...' : 'Onboard Partner'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Modal */}
      {activeModal === 'edit' && selectedPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md glass rounded-2xl p-6 relative animate-fade-in">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white tracking-tight mb-4 flex items-center space-x-2">
              <Edit3 className="h-5 w-5 text-[#e50914]" />
              <span>Modify Publisher Profile</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ companyName, contactEmail, paymentDetails, paymentCycle, status });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billing Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cycle</label>
                <select
                  value={paymentCycle}
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="NET_15">Net 15</option>
                  <option value="NET_30">Net 30</option>
                  <option value="NET_45">Net 45</option>
                  <option value="NET_60">Net 60</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Rev Share Modal */}
      {activeModal === 'rev-share' && selectedPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm glass rounded-2xl p-6 relative animate-fade-in">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white tracking-tight mb-4 flex items-center space-x-2">
              <Percent className="h-5 w-5 text-[#e50914]" />
              <span>Set Revenue Share %</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              revShareMutation.mutate({ sharePercentage, effectiveFrom });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Publisher Share Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={sharePercentage}
                  onChange={(e) => setSharePercentage(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={revShareMutation.isPending}
                className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
              >
                {revShareMutation.isPending ? 'Saving...' : 'Apply Config'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Password Reset Modal */}
      {activeModal === 'password' && selectedPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm glass rounded-2xl p-6 relative animate-fade-in">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-white tracking-tight mb-4 flex items-center space-x-2">
              <Key className="h-5 w-5 text-yellow-400" />
              <span>Reset Account Password</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              passwordMutation.mutate({ password });
            }} className="space-y-4 text-left">
              <div className="bg-yellow-950/20 border border-yellow-800/30 p-3 rounded-lg flex items-start space-x-2 text-[10px] font-bold text-[#facc15] leading-relaxed">
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>Resetting the password will immediately affect the publisher's login access. Choose a secure new password.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#16181e] border border-[#21242e] text-white rounded-lg py-2.5 px-3 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
              >
                {passwordMutation.isPending ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
