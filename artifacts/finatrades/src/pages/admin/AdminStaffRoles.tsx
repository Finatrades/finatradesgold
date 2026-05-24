import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Shield, ShieldCheck, Users as UsersIcon, Mail, History, KeyRound, UserPlus,
  Lock, Unlock, LogOut, Trash2, Plus, Save,
} from 'lucide-react';

const REDBRICK = '#C73B22';
const CREAM = '#FAFAF8';
const DARK = '#1A1A1A';
const MUTED = '#888880';

type AdminRole = {
  id: string;
  name: string;
  description?: string | null;
  department?: string | null;
  risk_level?: string | null;
  is_system?: boolean | null;
  is_active?: boolean | null;
};

type AdminComponent = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  sort_order?: number | null;
};

type RolePermission = {
  component_id: string;
  component_slug?: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_approve_l1?: boolean;
  can_approve_final?: boolean;
  can_reject?: boolean;
  can_export?: boolean;
  can_delete?: boolean;
};

type StaffMember = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  is_suspended?: boolean | null;
  is_email_verified?: boolean | null;
  last_login?: string | null;
  created_at?: string | null;
  roles: Array<{
    roleId: string;
    roleName: string;
    riskLevel?: string;
    department?: string;
    approvalLevel?: string;
  }>;
};

type StaffInvite = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role_ids: string[];
  expires_at: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  invited_by_email?: string | null;
};

type AuditEntry = {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  action_type: string;
  actor: string;
  actor_email?: string | null;
  actor_first_name?: string | null;
  actor_last_name?: string | null;
  details?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  timestamp: string;
};

const PERM_COLUMNS: Array<{ key: keyof RolePermission; label: string }> = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_approve_l1', label: 'Approve L1' },
  { key: 'can_approve_final', label: 'Approve Final' },
  { key: 'can_reject', label: 'Reject' },
  { key: 'can_export', label: 'Export' },
  { key: 'can_delete', label: 'Delete' },
];

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function actorLabel(e: AuditEntry): string {
  const name = `${e.actor_first_name || ''} ${e.actor_last_name || ''}`.trim();
  return name || e.actor_email || e.actor || 'system';
}

// ===================================================================
// Tab 1: Role Directory
// ===================================================================
function RoleDirectoryTab({ onSelectRole }: { onSelectRole: (role: AdminRole) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', department: '', riskLevel: 'Low' });

  const { data, isLoading } = useQuery<{ roles: AdminRole[] }>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/roles')).json(),
  });

  const createMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/admin/rbac/roles', form)).json(),
    onSuccess: () => {
      toast({ title: 'Role created' });
      setCreating(false);
      setForm({ name: '', description: '', department: '', riskLevel: 'Low' });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const [affected, setAffected] = useState<{ roleName: string; users: any[] } | null>(null);
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/rbac/roles/${id}/deactivate`, {});
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data?.error || 'Failed'), { affectedUsers: data?.affectedUsers });
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Role deactivated' });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'audit'] });
    },
    onError: (err: any, id) => {
      if (err?.affectedUsers) {
        const role = roles.find((r) => r.id === id);
        setAffected({ roleName: role?.name || 'role', users: err.affectedUsers });
        return;
      }
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    },
  });

  const roles = data?.roles || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base" style={{ color: DARK }}>Role Directory</h3>
          <p className="text-xs" style={{ color: MUTED }}>{roles.length} role{roles.length === 1 ? '' : 's'} defined</p>
        </div>
        <Button onClick={() => setCreating(true)} style={{ background: REDBRICK, color: '#fff' }}>
          <Plus size={14} className="mr-2" /> New Role
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <table className="w-full text-sm">
          <thead style={{ background: CREAM }}>
            <tr style={{ color: MUTED }}>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Risk</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: MUTED }}>Loading…</td></tr>
            )}
            {roles.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: DARK }}>{r.name}</div>
                  {r.description && <div className="text-xs mt-0.5" style={{ color: MUTED }}>{r.description}</div>}
                </td>
                <td className="px-4 py-3" style={{ color: DARK }}>{r.department || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" style={{ borderColor: 'rgba(0,0,0,0.15)', color: DARK }}>
                    {r.risk_level || 'Low'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {r.is_system ? (
                    <Badge style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>System</Badge>
                  ) : (
                    <span className="text-xs" style={{ color: MUTED }}>Custom</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onSelectRole(r)} className="mr-2">
                    Edit permissions
                  </Button>
                  {!r.is_system && (
                    <Button size="sm" variant="ghost" title="Deactivate role" onClick={() => deleteMut.mutate(r.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!affected} onOpenChange={(o) => !o && setAffected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cannot deactivate "{affected?.roleName}"</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: MUTED }}>
              This role is still assigned to the following staff. Reassign them to a different role, then try again.
            </p>
            <div className="rounded-lg border max-h-[260px] overflow-y-auto" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              {affected?.users.map((u: any) => (
                <div key={u.id} className="px-3 py-2 text-sm border-b last:border-b-0"
                  style={{ borderColor: 'rgba(0,0,0,0.05)', color: DARK }}>
                  <div className="font-medium">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}</div>
                  <div className="text-xs" style={{ color: MUTED }}>{u.email}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setAffected(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create role</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Trade Operations Lead" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div>
                <Label>Risk level</Label>
                <select className="w-full mt-1 h-10 rounded-md border px-3 text-sm bg-white"
                  style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                  value={form.riskLevel}
                  onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={!form.name || createMut.isPending} onClick={() => createMut.mutate()}
              style={{ background: REDBRICK, color: '#fff' }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===================================================================
// Tab 2: Permission Matrix
// ===================================================================
function PermissionMatrixTab({ selectedRole }: { selectedRole: AdminRole | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: compsData } = useQuery<{ components: AdminComponent[] }>({
    queryKey: ['admin', 'rbac', 'components'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/components')).json(),
  });

  const { data: roleData } = useQuery<{ role: AdminRole; permissions: RolePermission[] }>({
    queryKey: ['admin', 'rbac', 'role', selectedRole?.id],
    queryFn: async () => (await apiRequest('GET', `/api/admin/rbac/roles/${selectedRole!.id}`)).json(),
    enabled: !!selectedRole,
  });

  const [matrix, setMatrix] = useState<Record<string, RolePermission>>({});
  const [dirty, setDirty] = useState(false);

  React.useEffect(() => {
    if (!roleData) return;
    const initial: Record<string, RolePermission> = {};
    for (const p of roleData.permissions) initial[p.component_id] = { ...p };
    setMatrix(initial);
    setDirty(false);
  }, [roleData]);

  const components = compsData?.components || [];
  const isSuperAdmin = selectedRole?.name === 'Super Admin' && selectedRole?.is_system;
  const grouped = useMemo(() => {
    const g: Record<string, AdminComponent[]> = {};
    for (const c of components) {
      const cat = c.category || 'Other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(c);
    }
    return g;
  }, [components]);

  const toggle = (componentId: string, key: keyof RolePermission) => {
    if (isSuperAdmin) return;
    setMatrix((prev) => {
      const cur = prev[componentId] || { component_id: componentId };
      return { ...prev, [componentId]: { ...cur, [key]: !cur[key] } };
    });
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const permissions = components.map((c) => {
        const p = matrix[c.id] || {};
        return {
          componentId: c.id,
          canView: !!p.can_view,
          canCreate: !!p.can_create,
          canEdit: !!p.can_edit,
          canApproveL1: !!p.can_approve_l1,
          canApproveFinal: !!p.can_approve_final,
          canReject: !!p.can_reject,
          canExport: !!p.can_export,
          canDelete: !!p.can_delete,
        };
      });
      return (await apiRequest('PUT', `/api/admin/rbac/roles/${selectedRole!.id}/permissions`, { permissions })).json();
    },
    onSuccess: () => {
      toast({ title: 'Permissions saved' });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'role', selectedRole!.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'audit'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  if (!selectedRole) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <Shield size={32} style={{ color: MUTED, margin: '0 auto 12px' }} />
        <p style={{ color: DARK }} className="font-medium">Select a role to edit its permissions</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>Pick one from the Role Directory tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-base" style={{ color: DARK }}>{selectedRole.name}</h3>
          <p className="text-xs" style={{ color: MUTED }}>
            {isSuperAdmin
              ? 'Super Admin has implicit full access — matrix is read-only.'
              : 'Toggle component permissions. Changes save as a single atomic update.'}
          </p>
        </div>
        {!isSuperAdmin && (
          <Button disabled={!dirty || saveMut.isPending} onClick={() => saveMut.mutate()}
            style={{ background: REDBRICK, color: '#fff' }}>
            <Save size={14} className="mr-2" /> Save changes
          </Button>
        )}
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <table className="w-full text-sm">
          <thead style={{ background: CREAM }}>
            <tr style={{ color: MUTED }}>
              <th className="text-left px-4 py-3 font-medium sticky left-0" style={{ background: CREAM }}>Component</th>
              {PERM_COLUMNS.map((c) => (
                <th key={c.key as string} className="px-3 py-3 font-medium text-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, comps]) => (
              <React.Fragment key={cat}>
                <tr><td colSpan={1 + PERM_COLUMNS.length}
                  className="px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                  style={{ color: MUTED, background: 'rgba(0,0,0,0.02)' }}>{cat}</td></tr>
                {comps.map((c) => {
                  const row = matrix[c.id] || ({ component_id: c.id } as RolePermission);
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                      <td className="px-4 py-2.5 sticky left-0 bg-white">
                        <div className="font-medium" style={{ color: DARK }}>{c.name}</div>
                        <div className="text-[11px]" style={{ color: MUTED }}>{c.slug}</div>
                      </td>
                      {PERM_COLUMNS.map((col) => (
                        <td key={col.key as string} className="px-3 py-2.5 text-center">
                          <Switch
                            checked={isSuperAdmin ? true : !!row[col.key]}
                            disabled={!!isSuperAdmin}
                            onCheckedChange={() => toggle(c.id, col.key)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================================================================
// Tab 3: Staff Directory
// ===================================================================
function StaffDirectoryTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);

  const { data: staffData, isLoading } = useQuery<{ staff: StaffMember[] }>({
    queryKey: ['admin', 'rbac', 'staff'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/staff')).json(),
  });

  const { data: rolesData } = useQuery<{ roles: AdminRole[] }>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/roles')).json(),
  });

  const actionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'suspend' | 'unsuspend' | 'force-logout' }) =>
      (await apiRequest('POST', `/api/admin/rbac/staff/${id}/${action}`, {})).json(),
    onSuccess: (_d, vars) => {
      toast({ title: 'Done', description: `Staff ${vars.action.replace('-', ' ')} successful.` });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'staff'] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'audit'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const saveRolesMut = useMutation({
    mutationFn: async () =>
      (await apiRequest('POST', `/api/admin/rbac/staff/${editing!.id}/roles`, { roleIds: editRoleIds })).json(),
    onSuccess: () => {
      toast({ title: 'Roles updated' });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'staff'] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'audit'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const staff = staffData?.staff || [];
  // SECURITY: Super Admin can only be granted via direct DB action, so it must
  // not appear in the assignment list. The backend also rejects it, but
  // hiding the option here prevents accidental clicks.
  const roles = (rolesData?.roles || []).filter((r) => !(r.name === 'Super Admin' && r.is_system));

  const openEdit = (s: StaffMember) => {
    setEditing(s);
    setEditRoleIds(s.roles.map((r) => r.roleId));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base" style={{ color: DARK }}>Staff Directory</h3>
        <p className="text-xs" style={{ color: MUTED }}>{staff.length} admin user{staff.length === 1 ? '' : 's'}</p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <table className="w-full text-sm">
          <thead style={{ background: CREAM }}>
            <tr style={{ color: MUTED }}>
              <th className="text-left px-4 py-3 font-medium">Staff member</th>
              <th className="text-left px-4 py-3 font-medium">Roles</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Last login</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: MUTED }}>Loading…</td></tr>}
            {staff.map((s) => {
              const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email.split('@')[0];
              return (
                <tr key={s.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: DARK }}>{name}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{s.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {s.roles.length === 0 ? (
                      <span className="text-xs" style={{ color: MUTED }}>No roles</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.roles.map((r) => (
                          <Badge key={r.roleId} variant="outline" style={{ borderColor: 'rgba(199,59,34,0.25)', color: REDBRICK }}>
                            {r.roleName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_suspended ? (
                      <Badge style={{ background: 'rgba(199,59,34,0.10)', color: REDBRICK }}>Suspended</Badge>
                    ) : (
                      <Badge style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}>Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{fmtDate(s.last_login)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      <KeyRound size={13} className="mr-1.5" /> Roles
                    </Button>
                    {s.is_suspended ? (
                      <Button size="sm" variant="outline" onClick={() => actionMut.mutate({ id: s.id, action: 'unsuspend' })}>
                        <Unlock size={13} className="mr-1.5" /> Unsuspend
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => actionMut.mutate({ id: s.id, action: 'suspend' })}>
                        <Lock size={13} className="mr-1.5" /> Suspend
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => actionMut.mutate({ id: s.id, action: 'force-logout' })}>
                      <LogOut size={13} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign roles · {editing?.email}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {roles.map((r) => (
              <label key={r.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                style={{ borderColor: editRoleIds.includes(r.id) ? REDBRICK : 'rgba(0,0,0,0.08)' }}>
                <input type="checkbox" className="mt-1"
                  checked={editRoleIds.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) setEditRoleIds([...editRoleIds, r.id]);
                    else setEditRoleIds(editRoleIds.filter((x) => x !== r.id));
                  }} />
                <div>
                  <div className="font-medium text-sm" style={{ color: DARK }}>{r.name}</div>
                  {r.description && <div className="text-xs" style={{ color: MUTED }}>{r.description}</div>}
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveRolesMut.isPending} onClick={() => saveRolesMut.mutate()}
              style={{ background: REDBRICK, color: '#fff' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===================================================================
// Tab 4: Invite Staff
// ===================================================================
function InviteStaffTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', roleIds: [] as string[] });

  const { data: rolesData } = useQuery<{ roles: AdminRole[] }>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/roles')).json(),
  });
  const { data: invitesData } = useQuery<{ invites: StaffInvite[] }>({
    queryKey: ['admin', 'rbac', 'invites'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/staff/invites')).json(),
  });

  const inviteMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/admin/rbac/staff/invite', form)).json(),
    onSuccess: () => {
      toast({ title: 'Invite sent' });
      setForm({ email: '', firstName: '', lastName: '', roleIds: [] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'invites'] });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'audit'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => (await apiRequest('POST', `/api/admin/rbac/staff/invites/${id}/revoke`, {})).json(),
    onSuccess: () => {
      toast({ title: 'Invite revoked' });
      qc.invalidateQueries({ queryKey: ['admin', 'rbac', 'invites'] });
    },
    onError: (err: any) => toast({ title: 'Failed', description: err?.message, variant: 'destructive' }),
  });

  const roles = (rolesData?.roles || []).filter((r) => r.name !== 'Super Admin');
  const invites = invitesData?.invites || [];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <div>
          <h3 className="font-semibold text-base" style={{ color: DARK }}>Invite a staff member</h3>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            They'll receive an email with a one-time link to set a password and activate their account.
          </p>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="person@example.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Roles</Label>
          <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer text-sm"
                style={{ borderColor: form.roleIds.includes(r.id) ? REDBRICK : 'rgba(0,0,0,0.08)' }}>
                <input type="checkbox" checked={form.roleIds.includes(r.id)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      roleIds: e.target.checked
                        ? [...f.roleIds, r.id]
                        : f.roleIds.filter((x) => x !== r.id),
                    }));
                  }} />
                <span style={{ color: DARK }}>{r.name}</span>
                <span className="text-xs ml-auto" style={{ color: MUTED }}>{r.department || ''}</span>
              </label>
            ))}
          </div>
        </div>
        <Button disabled={!form.email || form.roleIds.length === 0 || inviteMut.isPending}
          onClick={() => inviteMut.mutate()}
          className="w-full" style={{ background: REDBRICK, color: '#fff' }}>
          <UserPlus size={14} className="mr-2" /> Send invitation
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <h3 className="font-semibold text-base" style={{ color: DARK }}>Recent invites</h3>
          <p className="text-xs" style={{ color: MUTED }}>{invites.length} on file</p>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {invites.length === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: MUTED }}>No invites yet.</div>
          )}
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < Date.now();
            const statusColor = inv.status === 'accepted' ? '#16A34A'
              : inv.status === 'revoked' ? '#888' : expired ? '#B45309' : REDBRICK;
            const statusLabel = inv.status === 'pending' && expired ? 'Expired' : inv.status;
            return (
              <div key={inv.id} className="px-5 py-3 border-t flex items-start gap-3" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: DARK }}>{inv.email}</div>
                  <div className="text-xs mt-0.5" style={{ color: MUTED }}>
                    Invited {fmtDate(inv.created_at)} · expires {fmtDate(inv.expires_at)}
                  </div>
                </div>
                <Badge style={{ background: `${statusColor}1A`, color: statusColor, textTransform: 'capitalize' }}>
                  {statusLabel}
                </Badge>
                {inv.status === 'pending' && !expired && (
                  <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(inv.id)}>Revoke</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Tab 5: Audit Trail
// ===================================================================
function AuditTrailTab() {
  const { data, isLoading } = useQuery<{ entries: AuditEntry[] }>({
    queryKey: ['admin', 'rbac', 'audit'],
    queryFn: async () => (await apiRequest('GET', '/api/admin/rbac/audit-log?limit=200')).json(),
  });
  const entries = data?.entries || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base" style={{ color: DARK }}>RBAC Audit Trail</h3>
        <p className="text-xs" style={{ color: MUTED }}>Last 200 staff & role events.</p>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}>
        {isLoading && <div className="px-5 py-8 text-center text-sm" style={{ color: MUTED }}>Loading…</div>}
        {entries.length === 0 && !isLoading && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: MUTED }}>No audit entries.</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="px-5 py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(199,59,34,0.08)' }}>
                <History size={14} style={{ color: REDBRICK }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm" style={{ color: DARK }}>
                  <span className="font-medium">{actorLabel(e)}</span>{' '}
                  <span style={{ color: MUTED }}>·</span>{' '}
                  <span className="font-mono text-xs" style={{ color: REDBRICK }}>{e.action_type}</span>{' '}
                  <span style={{ color: MUTED }}>on</span>{' '}
                  <span className="font-mono text-xs" style={{ color: DARK }}>{e.entity_type}</span>
                </div>
                {e.details && <div className="text-xs mt-1" style={{ color: MUTED }}>{e.details}</div>}
                <div className="text-[11px] mt-1" style={{ color: MUTED }}>{fmtDate(e.timestamp)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// Container
// ===================================================================
export default function AdminStaffRoles() {
  const [tab, setTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: DARK }}>Staff & Roles</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Manage admin roles, permissions, staff accounts, invitations, and audit history.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="roles"><Shield size={14} className="mr-1.5" />Roles</TabsTrigger>
          <TabsTrigger value="matrix"><ShieldCheck size={14} className="mr-1.5" />Permissions</TabsTrigger>
          <TabsTrigger value="staff"><UsersIcon size={14} className="mr-1.5" />Staff</TabsTrigger>
          <TabsTrigger value="invite"><Mail size={14} className="mr-1.5" />Invite</TabsTrigger>
          <TabsTrigger value="audit"><History size={14} className="mr-1.5" />Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RoleDirectoryTab onSelectRole={(r) => { setSelectedRole(r); setTab('matrix'); }} />
        </TabsContent>
        <TabsContent value="matrix" className="mt-6">
          <PermissionMatrixTab selectedRole={selectedRole} />
        </TabsContent>
        <TabsContent value="staff" className="mt-6"><StaffDirectoryTab /></TabsContent>
        <TabsContent value="invite" className="mt-6"><InviteStaffTab /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditTrailTab /></TabsContent>
      </Tabs>
    </div>
  );
}
