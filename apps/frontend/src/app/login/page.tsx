'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, Building2, User, Globe, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  
  // Auth state
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  // UI state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setFeedbackMsg(null);
    clearError();

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Invalid credentials. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password || !companyName) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setFeedbackMsg(null);

    try {
      await api.post('/auth/register', {
        email,
        name,
        password,
        companyName,
        contactEmail: contactEmail || email,
        paymentDetails: paymentDetails || 'Bank Transfer details pending',
      });

      setFeedbackMsg({
        type: 'success',
        text: 'Self-Registration Successful! Your publisher account is pending admin approval. You can now try logging in.',
      });
      
      // Clear forms
      setName('');
      setCompanyName('');
      setContactEmail('');
      setPaymentDetails('');
      setIsRegisterMode(false);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Registration failed. Email might already be taken.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090a0c] px-4 py-12 relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#e50914] opacity-[0.06] filter blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#ff5757] opacity-[0.04] filter blur-[100px]" />

      <div className="w-full max-w-md glass glass-red glass-glow rounded-2xl p-8 relative z-10 animate-fade-in">
        
        {/* Branding Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-black tracking-tighter text-white">
              ROLLIN<span className="text-[#e50914]">HEAD</span>
            </span>
            <span className="bg-[#e5091422] text-[#e50914] text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-[#e5091433]">
              Adtech
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400 font-medium tracking-wide text-center">
            {isRegisterMode 
              ? 'Join as an adtech publisher partner' 
              : 'Enterprise publisher & operations management console'}
          </p>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`mb-6 p-4 rounded-lg border text-sm font-medium ${
            feedbackMsg.type === 'success' 
              ? 'bg-[#15803d15] border-[#16653444] text-[#4ade80]' 
              : 'bg-[#b91c1c15] border-[#991b1b44] text-[#f87171]'
          }`}>
            {feedbackMsg.text}
          </div>
        )}

        <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit} className="space-y-5">
          {/* Registration Fields */}
          {isRegisterMode && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Full Name <span className="text-[#e50914]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Company Name <span className="text-[#e50914]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Email Address <span className="text-[#e50914]">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Password <span className="text-[#e50914]">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
              />
            </div>
          </div>

          {/* More Registration Fields */}
          {isRegisterMode && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Contact Email <span className="text-gray-600">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="billing@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Details <span className="text-gray-600">(Optional)</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Bank Transfer IBAN/Swift"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    className="w-full bg-[#16181e] border border-[#21242e] focus:border-[#e50914] text-white rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-[#e5091422] hover:shadow-[#e5091444]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRegisterMode ? (
              'Create Partner Account'
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-5 border-t border-[#21242e] text-center">
          <p className="text-xs text-gray-500">
            {isRegisterMode ? 'Already have an account?' : 'Are you a new publisher website partner?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setFeedbackMsg(null);
            }}
            className="mt-2 text-xs font-bold text-[#e50914] hover:text-[#ff5757] transition-all cursor-pointer focus:outline-none"
          >
            {isRegisterMode ? 'Access Existing Account' : 'Register Your Website & Tags'}
          </button>
        </div>

      </div>
    </div>
  );
}
