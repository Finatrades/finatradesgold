import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, ArrowRight, Shield, Lock, AlertTriangle } from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const { adminLogin, verifyMfa, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.role === 'admin') setLocation('/admin/dashboard');
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const mfa = await adminLogin(email, password);
      if (mfa?.requiresMfa) {
        setMfaRequired(true);
        setChallengeToken(mfa.challengeToken);
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid administrator credentials.');
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
    } catch {
      setError('Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#0E0E10' }}>
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(199,59,34,0.18) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(199,59,34,0.10) 0%, transparent 45%)' }} />

      <div className="relative w-full max-w-[440px]">
        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.06)' }}>

          <div className="flex items-center justify-between mb-8">
            <img src={finatradesLogo} alt="Finatrades" className="h-7 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ background: 'rgba(199,59,34,0.15)', border: '1px solid rgba(199,59,34,0.30)', color: '#E8896E' }}>
              <Shield size={10} /> ADMIN PORTAL
            </span>
          </div>

          {!mfaRequired ? (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold mb-1 text-white">Administrator sign in</h2>
                <p className="text-sm text-[#888880]">Restricted area — platform staff only.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 tracking-wide text-[#A8A8A0]">EMAIL</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="admin@finatrades.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: '#0E0E10', border: '1.5px solid rgba(255,255,255,0.08)', color: '#FFFFFF' }}
                    onFocus={e => e.target.style.borderColor = '#C73B22'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 tracking-wide text-[#A8A8A0]">PASSWORD</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                      style={{ background: '#0E0E10', border: '1.5px solid rgba(255,255,255,0.08)', color: '#FFFFFF' }}
                      onFocus={e => e.target.style.borderColor = '#C73B22'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888880]">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl text-sm"
                    style={{ background: 'rgba(199,59,34,0.10)', border: '1px solid rgba(199,59,34,0.25)', color: '#E8896E' }}>
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all mt-2"
                  style={{ background: loading ? '#555' : '#C73B22' }}>
                  {loading ? 'Authenticating…' : (<><Lock size={14} /><span>Sign in to admin portal</span><ArrowRight size={16} /></>)}
                </button>
              </form>

              <div className="mt-7 pt-5 flex items-center justify-between text-xs"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[#666660]">Not an admin?</span>
                <a href="/login" className="font-medium" style={{ color: '#E8896E' }}>
                  Client login →
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="mb-7">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(199,59,34,0.12)', border: '1px solid rgba(199,59,34,0.25)' }}>
                  <Shield size={20} style={{ color: '#E8896E' }} />
                </div>
                <h2 className="text-2xl font-bold mb-1 text-white">Two-factor authentication</h2>
                <p className="text-sm text-[#888880]">Enter the 6-digit code from your authenticator app.</p>
              </div>

              <form onSubmit={handleMfa} className="space-y-4">
                <input
                  type="text" value={mfaToken}
                  onChange={e => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required placeholder="000000" maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-base text-center tracking-[0.5em] font-mono outline-none text-white"
                  style={{ background: '#0E0E10', border: '1.5px solid rgba(255,255,255,0.08)' }}
                />
                {error && (
                  <div className="px-3.5 py-2.5 rounded-xl text-sm"
                    style={{ background: 'rgba(199,59,34,0.10)', border: '1px solid rgba(199,59,34,0.25)', color: '#E8896E' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading || mfaToken.length !== 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: loading || mfaToken.length !== 6 ? '#555' : '#C73B22' }}>
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </button>
                <button type="button" onClick={() => setMfaRequired(false)}
                  className="w-full text-sm text-center text-[#888880]">
                  ← Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#555550] mt-5">
          Finatrades Admin Portal · Access logged & monitored
        </p>
      </div>
    </div>
  );
}
