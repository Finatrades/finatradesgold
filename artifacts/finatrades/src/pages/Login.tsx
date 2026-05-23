import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, ArrowRight, Shield, Globe, Lock } from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const { login, verifyMfa } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const mfa = await login(email, password);
      if (mfa?.requiresMfa) {
        setMfaRequired(true);
        setChallengeToken(mfa.challengeToken);
      } else {
        setLocation('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMfa(challengeToken, mfaToken);
      setLocation('/dashboard');
    } catch {
      setError('Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#1A1A1A' }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #C73B22 0%, transparent 50%), radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 50%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src={finatradesLogo} alt="Finatrades" className="h-9 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: 'rgba(199,59,34,0.15)', border: '1px solid rgba(199,59,34,0.30)', color: '#E8896E' }}>
              <Shield size={11} /> Swiss Regulated · DIFC Registered
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Africa's Institutional<br />
              <span style={{ color: '#C73B22' }}>Commodity Trade</span><br />
              Infrastructure
            </h1>
            <p className="text-[#888880] text-base leading-relaxed max-w-md">
              Verified inventory. Compliant counterparties. Escrow-backed settlement — across 14 African trade hubs.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: <Shield size={14} />, label: 'KYC/KYB compliant onboarding', sub: 'AML & sanctions screened' },
              { icon: <Lock size={14} />, label: 'Escrow-governed settlement', sub: 'FUSD reference valuation' },
              { icon: <Globe size={14} />, label: '14 verified African trade hubs', sub: 'Real-time inventory tracking' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(199,59,34,0.15)', color: '#C73B22' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{f.label}</p>
                  <p className="text-[#666660] text-xs">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <p className="text-[#555550] text-xs">www.finatrades.com</p>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <img src={finatradesLogo} alt="Finatrades" className="h-8 w-auto" />
          </div>

          {!mfaRequired ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Sign in</h2>
                <p className="text-sm" style={{ color: '#888880' }}>Access your institutional trade portal</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #E8E2DC',
                      color: '#1A1A1A',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C73B22'}
                    onBlur={e => e.target.style.borderColor = '#E8E2DC'}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Password</label>
                    <button type="button" className="text-xs font-medium" style={{ color: '#C73B22' }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #E8E2DC',
                        color: '#1A1A1A',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C73B22'}
                      onBlur={e => e.target.style.borderColor = '#E8E2DC'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#888880' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.20)', color: '#C73B22' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all mt-2"
                  style={{ background: loading ? '#888' : '#C73B22' }}
                >
                  {loading ? 'Signing in…' : (
                    <><span>Sign in</span><ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #E8E2DC' }}>
                <p className="text-sm text-center" style={{ color: '#888880' }}>
                  Don't have an account?{' '}
                  <a href="/register" className="font-semibold" style={{ color: '#C73B22' }}>
                    Request access
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(199,59,34,0.08)', border: '1px solid rgba(199,59,34,0.20)' }}>
                  <Shield size={22} style={{ color: '#C73B22' }} />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Two-factor authentication</h2>
                <p className="text-sm" style={{ color: '#888880' }}>Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handleMfa} className="space-y-4">
                <input
                  type="text"
                  value={mfaToken}
                  onChange={e => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-sm text-center tracking-[0.5em] font-mono outline-none"
                  style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1A1A' }}
                />
                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.20)', color: '#C73B22' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || mfaToken.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: loading || mfaToken.length !== 6 ? '#C0BAB4' : '#C73B22' }}
                >
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </button>
                <button type="button" onClick={() => setMfaRequired(false)}
                  className="w-full text-sm text-center" style={{ color: '#888880' }}>
                  ← Back to login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
