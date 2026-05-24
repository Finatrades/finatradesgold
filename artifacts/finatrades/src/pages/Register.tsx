import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, ArrowLeft, Check, Building2, Package, Landmark, Eye, EyeOff } from 'lucide-react';
import finatradesLogo from '@/assets/finatrades-logo-purple.png';

const ROLES = [
  {
    id: 'exporter',
    icon: <Package size={22} />,
    label: 'Exporter / Seller',
    desc: 'List verified commodity inventory and connect with global buyers',
  },
  {
    id: 'importer',
    icon: <Building2 size={22} />,
    label: 'Importer / Buyer',
    desc: 'Source and procure verified commodities from African trade hubs',
  },
  {
    id: 'government',
    icon: <Landmark size={22} />,
    label: 'Government Entity',
    desc: 'Manage sovereign commodity barter and policy-backed trade programs',
  },
];

const STEPS = ['Role', 'Account', 'Company', 'Review'];

export default function Register() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    country: '',
    registrationNumber: '',
    taxId: '',
    website: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-white"
  const inputStyle = { border: '1.5px solid #E8E2DC', color: '#1A1A1A' };
  const labelCls = "block text-sm font-medium mb-1.5";

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await register({
        ...form,
        role: 'user',
        userType: role, // exporter | importer | government
        accountType: 'business',
        username: form.email,
        fullName: `${form.firstName} ${form.lastName}`,
      });
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white" style={{ borderBottom: '1px solid #E8E2DC' }}>
        <img src={finatradesLogo} alt="Finatrades" className="h-8 w-auto" />
        <p className="text-sm" style={{ color: '#888880' }}>
          Already have an account?{' '}
          <a href="/login" className="font-semibold" style={{ color: '#C73B22' }}>Sign in</a>
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">

          {/* Progress */}
          <div className="flex items-center gap-0 mb-10">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: i < step ? '#C73B22' : i === step ? '#C73B22' : '#E8E2DC',
                      color: i <= step ? '#fff' : '#888880',
                    }}>
                    {i < step ? <Check size={13} /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:block" style={{ color: i === step ? '#1A1A1A' : '#888880' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-3" style={{ background: i < step ? '#C73B22' : '#E8E2DC' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 0 — Role Selection */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Select your role</h2>
              <p className="text-sm mb-7" style={{ color: '#888880' }}>How will you use the Finatrades platform?</p>
              <div className="space-y-3">
                {ROLES.map(r => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                    style={{
                      background: role === r.id ? 'rgba(199,59,34,0.05)' : '#FFFFFF',
                      border: `2px solid ${role === r.id ? '#C73B22' : '#E8E2DC'}`,
                    }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: role === r.id ? 'rgba(199,59,34,0.10)' : '#F5F0EB', color: role === r.id ? '#C73B22' : '#888880' }}>
                      {r.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888880' }}>{r.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: role === r.id ? '#C73B22' : '#D0CAC4' }}>
                      {role === r.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#C73B22' }} />}
                    </div>
                  </button>
                ))}
              </div>
              <button disabled={!role} onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white mt-6"
                style={{ background: role ? '#C73B22' : '#C0BAB4' }}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Account details</h2>
              <p className="text-sm mb-7" style={{ color: '#888880' }}>Your personal credentials for platform access</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={{ color: '#1A1A1A' }}>First name</label>
                    <input className={inputCls} style={inputStyle} placeholder="John"
                      value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: '#1A1A1A' }}>Last name</label>
                    <input className={inputCls} style={inputStyle} placeholder="Doe"
                      value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Work email</label>
                  <input type="email" className={inputCls} style={inputStyle} placeholder="you@company.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Phone number</label>
                  <input type="tel" className={inputCls} style={inputStyle} placeholder="+1 234 567 8900"
                    value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} className={inputCls + ' pr-11'}
                      style={inputStyle} placeholder="Min. 8 characters"
                      value={form.password} onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#888880' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: '#F0EBE5', color: '#1A1A1A' }}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={() => setStep(2)} disabled={!form.firstName || !form.email || !form.password}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: (form.firstName && form.email && form.password) ? '#C73B22' : '#C0BAB4' }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Company Info */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Company details</h2>
              <p className="text-sm mb-7" style={{ color: '#888880' }}>Required for KYB verification and compliance screening</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Company / Entity name</label>
                  <input className={inputCls} style={inputStyle} placeholder="ABC Trading Ltd."
                    value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Country of registration</label>
                  <input className={inputCls} style={inputStyle} placeholder="Ghana"
                    value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={{ color: '#1A1A1A' }}>Registration number</label>
                    <input className={inputCls} style={inputStyle} placeholder="RC-12345678"
                      value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: '#1A1A1A' }}>Tax ID (TIN)</label>
                    <input className={inputCls} style={inputStyle} placeholder="TIN-987654"
                      value={form.taxId} onChange={e => set('taxId', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#1A1A1A' }}>Company website <span style={{ color: '#888880' }}>(optional)</span></label>
                  <input className={inputCls} style={inputStyle} placeholder="https://yourcompany.com"
                    value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: '#F0EBE5', color: '#1A1A1A' }}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!form.companyName || !form.country}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: (form.companyName && form.country) ? '#C73B22' : '#C0BAB4' }}>
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Review & submit</h2>
              <p className="text-sm mb-7" style={{ color: '#888880' }}>Confirm your details before submitting for compliance review</p>

              <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1.5px solid #E8E2DC' }}>
                {[
                  { label: 'Role', value: ROLES.find(r => r.id === role)?.label },
                  { label: 'Name', value: `${form.firstName} ${form.lastName}` },
                  { label: 'Email', value: form.email },
                  { label: 'Company', value: form.companyName },
                  { label: 'Country', value: form.country },
                  { label: 'Registration No.', value: form.registrationNumber || '—' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < 5 ? '1px solid #F0EBE5' : 'none', background: '#FFFFFF' }}>
                    <span className="text-xs font-medium" style={{ color: '#888880' }}>{item.label}</span>
                    <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl mb-5 text-sm" style={{ background: 'rgba(199,59,34,0.04)', border: '1px solid rgba(199,59,34,0.15)', color: '#888880' }}>
                By submitting, you agree to our Terms of Service and consent to KYC/KYB verification. Approval typically takes 2–5 business days.
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm mb-4"
                  style={{ background: 'rgba(199,59,34,0.06)', border: '1px solid rgba(199,59,34,0.20)', color: '#C73B22' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: '#F0EBE5', color: '#1A1A1A' }}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: loading ? '#C0BAB4' : '#C73B22' }}>
                  {loading ? 'Submitting…' : <><span>Submit application</span><ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
