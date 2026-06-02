'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { Loader2, UserPlus, Edit3, Key, Percent, ShieldCheck, CheckCircle2, AlertTriangle, Eye, X, Globe } from 'lucide-react';
import { PaymentCycle, PublisherStatus } from '@rollinhead/types';

export default function AdminPublishersPage() {
  const queryClient = useQueryClient();

  // Queries all publishers
  const { data: publishers, isLoading, error } = useQuery({
    queryKey: ['admin-publishers'],
    queryFn: () => api.get('/publishers'),
    retry: false,
  });

  const useMock = false;

  // Mock fallbacks (unused but kept for type compatibility)
  const mockPublishers: any[] = [];

  const currentPublishers = useMock ? mockPublishers : (publishers || []);

  // Modals state
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'rev-share' | 'password' | 'add-website' | null>(null);
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

  // Website form states
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState('TECH');

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
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to onboard publisher.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/publishers/${selectedPub.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Publisher updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to update publisher.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const revShareMutation = useMutation({
    mutationFn: (data: any) => api.post(`/publishers/${selectedPub.id}/rev-share`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Revenue share percentage updated!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to update rev share.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.post(`/publishers/${selectedPub.id}/reset-password`, data),
    onSuccess: () => {
      setFeedback('Password reset successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to reset password.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const addWebsiteMutation = useMutation({
    mutationFn: (data: any) => api.post('/websites', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Website domain added successfully!');
      setTimeout(() => setFeedback(null), 3000);
      setActiveModal(null);
      setDomain('');
      setCategory('TECH');
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to add website.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const purgeDbMutation = useMutation({
    mutationFn: () => api.post('/auth/purge-db', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-publishers'] });
      setFeedback('Live production database cleared successfully!');
      setTimeout(() => {
        setFeedback(null);
        window.location.reload();
      }, 2000);
    },
    onError: (err: any) => {
      setFeedback(err.message || 'Failed to purge database.');
      setTimeout(() => setFeedback(null), 4000);
    }
  });

  const handlePurgeDb = () => {
    if (window.confirm('⚠️ WARNING: Are you sure you want to permanently delete ALL publisher accounts, websites, ad tags, historical reports, and log records from the live cloud database? This action is irreversible. Only your admin account will remain.')) {
      purgeDbMutation.mutate();
    }
  };

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

  const handleOpenAddWebsite = (pub: any) => {
    setSelectedPub(pub);
    setDomain('');
    setCategory('TECH');
    setActiveModal('add-website');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Publisher Directory</h2>
          <p className="text-xs text-slate-500 font-semibold tracking-wide mt-1">
            {useMock 
              ? '✨ Demonstration Mode (Database starting up)' 
              : 'Add, approve, and manage adtech publisher partners and revenue configurations'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Reset Production DB */}
          <button
            onClick={handlePurgeDb}
            disabled={purgeDbMutation.isPending}
            className="flex items-center justify-center space-x-2 bg-white border border-red-200 hover:bg-red-50 text-[#e50914] px-4 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 animate-fade-in"
            title="Wipe all data tables in production cloud"
          >
            <span>{purgeDbMutation.isPending ? 'Purging DB...' : 'Reset Live Database'}</span>
          </button>

          <button
            onClick={() => {
              clearForms();
              setActiveModal('create');
            }}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] text-white px-4 py-3 rounded-lg text-xs font-black transition-all cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444] animate-fade-in"
          >
            <UserPlus className="h-4 w-4" />
            <span>Onboard New Publisher</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="h-5 w-5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Registered Publishers</h3>
          <ShieldCheck className="h-5 w-5 text-slate-400" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Owner Account</th>
                <th className="px-6 py-4">Share %</th>
                <th className="px-6 py-4">Cycle</th>
                <th className="px-6 py-4">Websites</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white">
              {currentPublishers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium bg-white">
                    No registered publishers found. Use &quot;Onboard New Publisher&quot; to add one.
                  </td>
                </tr>
              ) : (
                currentPublishers.map((pub: any) => {
                  const activeShare = pub.revenueShareConfigs?.[0]?.sharePercentage || 80.00;
                  const websiteCount = pub.websites?.length || 0;

                  return (
                    <tr key={pub.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div>{pub.companyName}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{pub.contactEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        <div>{pub.user?.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-normal">{pub.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-[#e50914] font-black text-sm">{activeShare}%</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{pub.paymentCycle}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded font-bold text-[10px]">
                            {websiteCount} {websiteCount === 1 ? 'site' : 'sites'}
                          </span>
                          {websiteCount > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {pub.websites.map((w: any) => (
                                <span key={w.domain} className="text-[9px] text-slate-400 font-medium bg-slate-100/50 px-1 py-0.2 rounded border border-slate-200/40">
                                  {w.domain}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${
                          pub.status === 'ACTIVE'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : pub.status === 'PENDING'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          {pub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        
                        {/* Direct Add Website */}
                        <button
                          onClick={() => handleOpenAddWebsite(pub)}
                          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50/30 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          title="Add Website"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => handleOpenEdit(pub)}
                          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          title="Edit Publisher"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Revenue Share */}
                        <button
                          onClick={() => handleOpenRevShare(pub)}
                          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-[#e50914] hover:border-red-200 hover:bg-red-50/30 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          title="Configure Share %"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => handleOpenPassword(pub)}
                          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-yellow-600 hover:border-yellow-200 hover:bg-yellow-50/30 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          title="Reset Account Password"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>

                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modals Dialogs --- */}
      
      {/* 1. Onboard / Create Modal */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-[#e50914]" />
              <span>Onboard Partner Publisher</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ email, name, companyName, contactEmail });
            }} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Tech LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billing Contact Email</label>
                  <input
                    type="email"
                    placeholder="billing@tech.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">User / Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@tech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-[10px] text-slate-500 font-semibold leading-relaxed">
                ℹ️ **Password-less onboarding is active**. The publisher will receive an automated welcome email containing their secure temporary credentials and dashboard login link.
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
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 flex items-center space-x-2">
              <Edit3 className="h-5 w-5 text-[#e50914]" />
              <span>Modify Publisher Profile</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ companyName, contactEmail, paymentDetails, paymentCycle, status });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billing Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bank Payment Details</label>
                <input
                  type="text"
                  required
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cycle</label>
                <select
                  value={paymentCycle}
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs cursor-pointer"
                >
                  <option value="NET_15">Net 15</option>
                  <option value="NET_30">Net 30</option>
                  <option value="NET_45">Net 45</option>
                  <option value="NET_60">Net 60</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs cursor-pointer"
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
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 flex items-center space-x-2">
              <Percent className="h-5 w-5 text-[#e50914]" />
              <span>Set Revenue Share %</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              revShareMutation.mutate({ sharePercentage, effectiveFrom });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Publisher Share Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={sharePercentage}
                  onChange={(e) => setSharePercentage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
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
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-950 tracking-tight mb-4 flex items-center space-x-2">
              <Key className="h-5 w-5 text-yellow-500" />
              <span>Reset Account Password</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              passwordMutation.mutate({ password });
            }} className="space-y-4 text-left">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start space-x-2 text-[10px] font-bold text-yellow-750 leading-relaxed">
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 text-yellow-500" />
                <span>Resetting the password will immediately affect the publisher&apos;s login access. Choose a secure new password.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
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

      {/* 5. Direct Website Registration Modal */}
      {activeModal === 'add-website' && selectedPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-6 relative animate-fade-in shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 flex items-center space-x-2">
              <Globe className="h-5 w-5 text-green-600" />
              <span>Link New Website</span>
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              addWebsiteMutation.mutate({ publisherId: selectedPub.id, domain, category });
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Domain Name</label>
                <input
                  type="text"
                  required
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Website Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-red-200 rounded-lg py-2.5 px-3 text-xs cursor-pointer"
                >
                  <option value="TECH">Tech</option>
                  <option value="SPORTS">Sports</option>
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="LIFESTYLE">Lifestyle</option>
                  <option value="NEWS">News</option>
                  <option value="GAMING">Gaming</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={addWebsiteMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase cursor-pointer"
              >
                {addWebsiteMutation.isPending ? 'Registering...' : 'Add Website'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
