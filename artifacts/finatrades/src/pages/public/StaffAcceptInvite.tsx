import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

const REDBRICK = '#C73B22';
const CREAM = '#FAFAF8';
const DARK = '#1A1A1A';
const MUTED = '#888880';

type InviteInfo = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleNames: string[];
  expiresAt: string;
};

export default function StaffAcceptInvite() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setLoadError('Missing invite token.'); return; }
    apiRequest('GET', `/api/staff/invite-info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: InviteInfo) => {
        setInfo(d);
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
      })
      .catch((err) => setLoadError(err?.message || 'Invite is invalid or expired.'));
  }, [token]);

  const submit = async () => {
    setSubmitError(null);
    if (password.length < 10) { setSubmitError('Password must be at least 10 characters.'); return; }
    if (password !== confirm) { setSubmitError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const res = await apiRequest('POST', '/api/staff/accept-invite', {
        token, password, firstName, lastName,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to accept invite');
      // Server already created a session for us (auto-login). Drop the user
      // straight onto the admin dashboard with a small confirmation flash.
      setDone(true);
      const redirect = data?.redirectTo || '/admin/dashboard';
      window.setTimeout(() => {
        window.location.href = redirect;
      }, 900);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: CREAM }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-5"
          style={{ background: 'rgba(199,59,34,0.10)' }}>
          <ShieldCheck size={22} style={{ color: REDBRICK }} />
        </div>

        {loadError && (
          <div className="text-center">
            <XCircle size={28} style={{ color: REDBRICK, margin: '0 auto 12px' }} />
            <h1 className="text-lg font-bold" style={{ color: DARK }}>Invitation unavailable</h1>
            <p className="text-sm mt-2" style={{ color: MUTED }}>{loadError}</p>
          </div>
        )}

        {!loadError && !info && (
          <p className="text-center text-sm" style={{ color: MUTED }}>Loading invitation…</p>
        )}

        {info && done && (
          <div className="text-center">
            <CheckCircle2 size={32} style={{ color: '#16A34A', margin: '0 auto 12px' }} />
            <h1 className="text-lg font-bold" style={{ color: DARK }}>You're all set</h1>
            <p className="text-sm mt-2" style={{ color: MUTED }}>
              Your Finatrades admin account is active. Redirecting you to the admin dashboard…
            </p>
            <Button className="mt-6 w-full" style={{ background: REDBRICK, color: '#fff' }}
              onClick={() => { window.location.href = '/admin/dashboard'; }}>
              Open dashboard
            </Button>
          </div>
        )}

        {info && !done && (
          <>
            <h1 className="text-xl font-bold text-center" style={{ color: DARK }}>Accept your invitation</h1>
            <p className="text-sm text-center mt-2" style={{ color: MUTED }}>
              You're joining <strong style={{ color: DARK }}>Finatrades Admin</strong> as<br />
              <span style={{ color: REDBRICK }}>{info.roleNames.join(', ') || 'Staff'}</span>
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={info.email} disabled />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Create password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 10 characters" />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {submitError && (
                <div className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'rgba(199,59,34,0.08)', color: REDBRICK }}>
                  {submitError}
                </div>
              )}
              <Button onClick={submit} disabled={submitting} className="w-full"
                style={{ background: REDBRICK, color: '#fff' }}>
                {submitting ? 'Activating…' : 'Activate account'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
