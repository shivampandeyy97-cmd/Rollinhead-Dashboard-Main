'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, Building2, User, ShieldCheck } from 'lucide-react';
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
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

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
    if (!email || !name || !password || !companyName || !confirmPassword) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (password !== confirmPassword) {
      setFeedbackMsg({ type: 'error', text: 'Passwords do not match' });
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
        contactEmail: email, // Auto-default to login email
        paymentDetails: 'Bank Transfer details pending', // Auto-default
      });

      setFeedbackMsg({
        type: 'success',
        text: 'Signup Successful! Your publisher account is pending admin approval. You can now try logging in.',
      });
      
      // Clear forms
      setName('');
      setCompanyName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setFeedbackMsg({
        type: 'success',
        text: res.message || 'If the email exists in our system, a temporary password has been sent.',
      });
      setEmail('');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Soft Elegant Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e9ecef_1px,transparent_1px),linear-gradient(to_bottom,#e9ecef_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 relative z-10 shadow-xl shadow-slate-100/50 animate-fade-in">
        
        {/* Branding Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-950">
              Rollinhead<span className="text-[#e50914]">.</span>
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            {isForgotPasswordMode
              ? 'Reset your password'
              : isRegisterMode 
                ? 'Join as publisher' 
                : 'Publisher & operations console'}
          </p>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`mb-6 p-4 rounded-lg border text-xs font-semibold ${
            feedbackMsg.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {feedbackMsg.text}
          </div>
        )}

        {isForgotPasswordMode ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address <span className="text-[#e50914]">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Temporary Password'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit} className="space-y-4">
            {/* Registration Fields */}
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Name <span className="text-[#e50914]">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Company <span className="text-[#e50914]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Common Fields */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address <span className="text-[#e50914]">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password <span className="text-[#e50914]">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                />
              </div>
              {!isRegisterMode && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setFeedbackMsg(null);
                    }}
                    className="text-[10px] font-semibold text-slate-400 hover:text-[#e50914] transition-all cursor-pointer focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            {isRegisterMode && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm Password <span className="text-[#e50914]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] text-slate-900 rounded-lg py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all placeholder-slate-400 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5757] hover:from-[#c20811] hover:to-[#e04545] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRegisterMode ? (
                'Create Partner Account'
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          {isForgotPasswordMode ? (
            <>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                Remembered your password?
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setFeedbackMsg(null);
                }}
                className="mt-2 text-xs font-bold text-[#e50914] hover:text-[#ff5757] transition-all cursor-pointer focus:outline-none"
              >
                Access Existing Account
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
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
                {isRegisterMode ? 'Access Existing Account' : 'Signup'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
