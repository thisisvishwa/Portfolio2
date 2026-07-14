'use client';

import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Lock, User, Terminal, CheckCircle } from 'lucide-react';

export default function AdminLogin() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 2FA Transition States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Mismatched admin credentials.');
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaToken(data.data.mfaToken);
      } else {
        saveSessionAndRedirect(data.data.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failure to PMS servers.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, totpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid authenticator pin.');
      }

      saveSessionAndRedirect(data.data.accessToken);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failure.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionAndRedirect = (token: string) => {
    localStorage.setItem('adminToken', token);
    setLoginSuccess(true);
    setTimeout(() => {
      window.location.href = '/admin/dashboard';
    }, 1000);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-xl shadow-xl shadow-indigo-500/10">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NEXUS
            </span>
            <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 font-semibold text-[10px] rounded uppercase tracking-widest border border-indigo-500/30">
              GATEWAY
            </span>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-slate-900 shadow-2xl relative">
          
          {loginSuccess && (
            <div className="absolute inset-0 bg-slate-950/95 rounded-3xl z-20 flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <CheckCircle className="w-12 h-12 text-emerald-500 animate-bounce" />
              <div className="font-bold text-lg text-white">Handshake Confirmed</div>
              <p className="text-slate-500 text-xs">Redirecting to master overview panel...</p>
            </div>
          )}

          {mfaRequired ? (
            <form onSubmit={handleMfaSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit mx-auto">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white">MFA Verification</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Enter the 6-digit verification code from your authenticator app to authorize your session.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Authenticator Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl pl-11 pr-4 py-3.5 text-center text-lg font-mono tracking-[0.5em] text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-700"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md"
              >
                {isLoading ? 'Verifying Pin...' : 'Verify &amp; Establish Session'}
              </button>
            </form>
          ) : (
            
            <form onSubmit={handleCredentialSubmit} className="space-y-5">
              <div className="space-y-1.5 mb-2">
                <h2 className="text-xl font-bold text-white">System Access</h2>
                <p className="text-slate-500 text-xs">Enter credentials to open administrative portal.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Username or Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="administrator"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Password</label>
                  <a 
                    href="#forgot" 
                    onClick={() => alert('Check backend/src/services/emailService.ts for reset links!')}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl pl-11 pr-11 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md"
              >
                {isLoading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
