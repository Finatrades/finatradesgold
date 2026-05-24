import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Users as UsersIcon, Shield, Building2, User as UserIcon, Landmark, MoreVertical, CheckCircle2, XCircle, Mail, Snowflake } from 'lucide-react';

type AdminUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  finatradesId?: string | null;
  role: 'user' | 'admin';
  userType?: 'exporter' | 'importer' | 'government' | null;
  accountType?: string | null;
  emailVerified?: boolean | null;
  isFrozen?: boolean | null;
  isSuspended?: boolean | null;
  createdAt?: string | null;
  rbacRole?: { name?: string; risk_level?: string; department?: string } | null;
};

const USER_TYPE_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  exporter: { label: 'Exporter', icon: <Building2 size={11} />, color: '#C73B22' },
  importer: { label: 'Importer', icon: <UserIcon size={11} />, color: '#2C7A7B' },
  government: { label: 'Government', icon: <Landmark size={11} />, color: '#6B46C1' },
};

function statusOf(u: AdminUser): { label: string; color: string; bg: string } {
  if (u.isSuspended) return { label: 'Suspended', color: '#C73B22', bg: 'rgba(199,59,34,0.10)' };
  if (u.isFrozen) return { label: 'Frozen', color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' };
  if (u.emailVerified === false) return { label: 'Email unverified', color: '#B45309', bg: 'rgba(180,83,9,0.10)' };
  return { label: 'Active', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' };
}

function fullName(u: AdminUser): string {
  const fn = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return fn || u.email.split('@')[0];
}

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'exporter' | 'importer' | 'government'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return res.json();
    },
  });

  const users = data?.users || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (filterRole === 'admin' && u.role !== 'admin') return false;
      if (['exporter', 'importer', 'government'].includes(filterRole) && u.userType !== filterRole) return false;
      if (!q) return true;
      return (
        u.email?.toLowerCase().includes(q) ||
        u.finatradesId?.toLowerCase().includes(q) ||
        fullName(u).toLowerCase().includes(q)
      );
    });
  }, [users, search, filterRole]);

  const counts = useMemo(() => {
    const c = { total: users.length, admin: 0, exporter: 0, importer: 0, government: 0 };
    for (const u of users) {
      if (u.role === 'admin') c.admin++;
      if (u.userType === 'exporter') c.exporter++;
      if (u.userType === 'importer') c.importer++;
      if (u.userType === 'government') c.government++;
    }
    return c;
  }, [users]);

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'suspend' | 'activate' | 'verify-email' | 'freeze' }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/${action}`, {});
      return res.json();
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Updated', description: `User ${vars.action.replace('-', ' ')} successful.` });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setOpenMenu(null);
    },
    onError: (err: any) => {
      toast({ title: 'Action failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6" onClick={() => setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>All Users</h1>
          <p className="text-sm mt-1" style={{ color: '#888880' }}>
            Platform-wide directory · {counts.total} total
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'All', count: counts.total, icon: <UsersIcon size={14} />, color: '#1A1A1A' },
          { key: 'exporter', label: 'Exporters', count: counts.exporter, icon: <Building2 size={14} />, color: '#C73B22' },
          { key: 'importer', label: 'Importers', count: counts.importer, icon: <UserIcon size={14} />, color: '#2C7A7B' },
          { key: 'government', label: 'Government', count: counts.government, icon: <Landmark size={14} />, color: '#6B46C1' },
          { key: 'admin', label: 'Admins', count: counts.admin, icon: <Shield size={14} />, color: '#B45309' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterRole(f.key as any)}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all"
            style={{
              background: filterRole === f.key ? '#FFFFFF' : '#FAFAF8',
              border: `1.5px solid ${filterRole === f.key ? f.color : '#E8E2DC'}`,
              boxShadow: filterRole === f.key ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            }}>
            <div className="flex items-center gap-2.5">
              <span style={{ color: f.color }}>{f.icon}</span>
              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{f.label}</span>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: f.color }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#888880' }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or FT-ID…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1A1A' }}
          onFocus={e => e.currentTarget.style.borderColor = '#C73B22'}
          onBlur={e => e.currentTarget.style.borderColor = '#E8E2DC'}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}>
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#888880' }}>Loading users…</div>
        ) : error ? (
          <div className="p-12 text-center text-sm" style={{ color: '#C73B22' }}>
            Could not load users. {(error as any)?.message || ''}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: '#888880' }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DC' }}>
                  {['User', 'FT-ID', 'Type', 'Status', 'Joined', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#888880' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const st = statusOf(u);
                  const t = u.role === 'admin'
                    ? { label: u.rbacRole?.name || 'Admin', icon: <Shield size={11} />, color: '#B45309' }
                    : u.userType
                      ? USER_TYPE_LABEL[u.userType] || { label: u.userType, icon: <UserIcon size={11} />, color: '#888880' }
                      : { label: 'Unassigned', icon: <UserIcon size={11} />, color: '#888880' };

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F0EBE5' }}
                      className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium" style={{ color: '#1A1A1A' }}>{fullName(u)}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#888880' }}>{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs px-2 py-1 rounded-md font-mono"
                          style={{ background: '#FAFAF8', border: '1px solid #E8E2DC', color: '#1A1A1A' }}>
                          {u.finatradesId || '—'}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: `${t.color}15`, color: t.color }}>
                          {t.icon}{t.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: '#888880' }}>
                        {fmtDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === u.id ? null : u.id); }}
                          className="p-1.5 rounded-lg hover:bg-[#F0EBE5]"
                          style={{ color: '#888880' }}>
                          <MoreVertical size={16} />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-4 top-12 z-10 w-52 rounded-xl py-1 shadow-lg"
                            style={{ background: '#FFFFFF', border: '1px solid #E8E2DC' }}
                            onClick={(e) => e.stopPropagation()}>
                            {u.emailVerified === false && (
                              <button onClick={() => actionMutation.mutate({ userId: u.id, action: 'verify-email' })}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAFAF8] flex items-center gap-2"
                                style={{ color: '#1A1A1A' }}>
                                <Mail size={14} /> Mark email verified
                              </button>
                            )}
                            {!u.isSuspended ? (
                              <button onClick={() => actionMutation.mutate({ userId: u.id, action: 'suspend' })}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAFAF8] flex items-center gap-2"
                                style={{ color: '#C73B22' }}>
                                <XCircle size={14} /> Suspend account
                              </button>
                            ) : (
                              <button onClick={() => actionMutation.mutate({ userId: u.id, action: 'activate' })}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAFAF8] flex items-center gap-2"
                                style={{ color: '#16A34A' }}>
                                <CheckCircle2 size={14} /> Reactivate account
                              </button>
                            )}
                            <button onClick={() => actionMutation.mutate({ userId: u.id, action: 'freeze' })}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAFAF8] flex items-center gap-2"
                              style={{ color: '#0EA5E9' }}>
                              <Snowflake size={14} /> Freeze account
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
