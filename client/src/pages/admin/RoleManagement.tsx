import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Pencil, Trash2, Users, Lock, AlertTriangle, CheckCircle2, Eye, FileEdit, Download, X, CircleCheck, CircleAlert, Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  risk_level: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface AdminComponent {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  path: string | null;
  icon: string | null;
  sort_order: number;
}

interface Permission {
  id: string;
  role_id: string;
  component_id: string;
  component_name: string;
  component_slug: string;
  category: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve_l1: boolean;
  can_approve_final: boolean;
  can_reject: boolean;
  can_export: boolean;
  can_delete: boolean;
}

interface AssignedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  assigned_at: string;
  expires_at: string | null;
  assigned_by: string | null;
  assigned_by_first_name: string | null;
  assigned_by_last_name: string | null;
}

export default function RoleManagement() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", department: "", riskLevel: "Low" });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/rbac/roles");
      return res.json();
    },
  });

  const { data: componentsData } = useQuery({
    queryKey: ["admin-components"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/rbac/components");
      return res.json();
    },
  });

  const { data: rolePermissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ["role-permissions", selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return null;
      const res = await apiRequest("GET", `/api/admin/rbac/roles/${selectedRole.id}`);
      return res.json();
    },
    enabled: !!selectedRole,
  });

  const { data: roleUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ["role-users", selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return null;
      const res = await apiRequest("GET", `/api/admin/rbac/roles/${selectedRole.id}/users`);
      return res.json();
    },
    enabled: !!selectedRole,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof newRole) => {
      const res = await apiRequest("POST", "/api/admin/rbac/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setIsCreateDialogOpen(false);
      setNewRole({ name: "", description: "", department: "", riskLevel: "Low" });
      toast.success("Role created successfully");
    },
    onError: () => {
      toast.error("Failed to create role");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdminRole> }) => {
      const res = await apiRequest("PATCH", `/api/admin/rbac/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setIsEditDialogOpen(false);
      toast.success("Role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/rbac/roles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setSelectedRole(null);
      toast.success("Role deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete role");
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ roleId, componentId, permissions }: { roleId: string; componentId: string; permissions: Record<string, boolean> }) => {
      const res = await apiRequest("POST", "/api/admin/rbac/permissions", { roleId, componentId, permissions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", selectedRole?.id] });
      toast.success("Permission updated");
    },
    onError: () => {
      toast.error("Failed to update permission");
    },
  });

  const roles: AdminRole[] = rolesData?.roles || [];
  const components: AdminComponent[] = componentsData?.components || [];
  const permissions: Permission[] = rolePermissionsData?.permissions || [];

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      Low: { variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
      Medium: { variant: "outline", icon: <CircleAlert className="h-3 w-3" /> },
      High: { variant: "default", icon: <AlertTriangle className="h-3 w-3" /> },
      Critical: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const config = variants[riskLevel] || variants.Low;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {riskLevel}
      </Badge>
    );
  };

  const getPermissionForComponent = (componentId: string) => {
    return permissions.find((p) => p.component_id === componentId);
  };

  const handlePermissionChange = (componentId: string, permissionKey: string, value: boolean) => {
    if (!selectedRole) return;
    const currentPerms = getPermissionForComponent(componentId);
    const newPerms = {
      canView: currentPerms?.can_view || false,
      canCreate: currentPerms?.can_create || false,
      canEdit: currentPerms?.can_edit || false,
      canApproveL1: currentPerms?.can_approve_l1 || false,
      canApproveFinal: currentPerms?.can_approve_final || false,
      canReject: currentPerms?.can_reject || false,
      canExport: currentPerms?.can_export || false,
      canDelete: currentPerms?.can_delete || false,
      [permissionKey]: value,
    };
    updatePermissionMutation.mutate({ roleId: selectedRole.id, componentId, permissions: newPerms });
  };

  const componentsByCategory = components.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {} as Record<string, AdminComponent[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Role Management</h1>
            <p className="text-muted-foreground">Manage admin roles and permissions for the platform</p>
          </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-role-btn">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define a new admin role with specific permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  data-testid="input-role-name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., Senior Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-role-description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Role responsibilities and access level"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    data-testid="input-role-department"
                    value={newRole.department}
                    onChange={(e) => setNewRole({ ...newRole, department: e.target.value })}
                    placeholder="e.g., Finance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={newRole.riskLevel} onValueChange={(v) => setNewRole({ ...newRole, riskLevel: v })}>
                    <SelectTrigger data-testid="select-risk-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button data-testid="btn-save-role" onClick={() => createRoleMutation.mutate(newRole)} disabled={!newRole.name || createRoleMutation.isPending}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles ({roles.length})
            </CardTitle>
            <CardDescription>Select a role to view and edit permissions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {rolesLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading roles...</div>
            ) : (
              <div className="divide-y">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    data-testid={`role-item-${role.id}`}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedRole?.id === role.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{role.name}</span>
                      {role.is_system && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getRiskBadge(role.risk_level)}
                      {role.department && <span>{role.department}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedRole ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedRole.name}
                    {getRiskBadge(selectedRole.risk_level)}
                  </CardTitle>
                  <CardDescription>{selectedRole.description || "No description"}</CardDescription>
                </div>
                {!selectedRole.is_system && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this role? Users with this role will lose access.")) {
                          deleteRoleMutation.mutate(selectedRole.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="permissions">
                  <TabsList>
                    <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
                    <TabsTrigger value="users">Assigned Users</TabsTrigger>
                  </TabsList>
                  <TabsContent value="permissions" className="mt-4">
                    {permissionsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(componentsByCategory).map(([category, comps]) => (
                          <div key={category}>
                            <h3 className="font-semibold mb-3 capitalize">{category}</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Component</TableHead>
                                  <TableHead className="text-center w-[60px]"><Eye className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><Plus className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><FileEdit className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><CircleCheck className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><CheckCircle2 className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><X className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><Download className="h-4 w-4 mx-auto" /></TableHead>
                                  <TableHead className="text-center w-[60px]"><Trash2 className="h-4 w-4 mx-auto" /></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {comps.map((comp) => {
                                  const perm = getPermissionForComponent(comp.id);
                                  return (
                                    <TableRow key={comp.id}>
                                      <TableCell className="font-medium">{comp.name}</TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_view || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canView", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_create || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canCreate", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_edit || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canEdit", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_approve_l1 || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canApproveL1", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_approve_final || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canApproveFinal", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_reject || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canReject", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_export || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canExport", !!v)} />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox checked={selectedRole.is_system || perm?.can_delete || false} disabled={selectedRole.is_system} onCheckedChange={(v) => handlePermissionChange(comp.id, "canDelete", !!v)} />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                        <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> View</div>
                            <div className="flex items-center gap-1"><Plus className="h-3 w-3" /> Create</div>
                            <div className="flex items-center gap-1"><FileEdit className="h-3 w-3" /> Edit</div>
                            <div className="flex items-center gap-1"><CircleCheck className="h-3 w-3" /> L1 Approve</div>
                            <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Final Approve</div>
                            <div className="flex items-center gap-1"><X className="h-3 w-3" /> Reject</div>
                            <div className="flex items-center gap-1"><Download className="h-3 w-3" /> Export</div>
                            <div className="flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="users" className="mt-4">
                    {usersLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                    ) : (roleUsersData?.users && roleUsersData.users.length > 0) ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {roleUsersData.users.length} user{roleUsersData.users.length !== 1 ? 's' : ''} assigned to this role
                          </p>
                        </div>
                        {roleUsersData.users.map((user: AssignedUser) => (
                          <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profile_photo_url || undefined} />
                                <AvatarFallback>
                                  {(user.first_name?.[0] || '') + (user.last_name?.[0] || user.email[0].toUpperCase())}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {user.first_name && user.last_name 
                                    ? `${user.first_name} ${user.last_name}` 
                                    : user.email}
                                </p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Assigned {new Date(user.assigned_at).toLocaleDateString()}</span>
                              </div>
                              {user.assigned_by_first_name && (
                                <p className="text-xs text-muted-foreground">
                                  by {user.assigned_by_first_name} {user.assigned_by_last_name}
                                </p>
                              )}
                              {user.expires_at && (
                                <p className="text-xs text-amber-600">
                                  Expires: {new Date(user.expires_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No users assigned to this role</p>
                        <p className="text-sm">Assign users from the Employee Management page</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Shield className="h-16 w-16 mb-4 opacity-30" />
              <p>Select a role to view and edit permissions</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role details</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name</Label>
                <Input id="edit-name" defaultValue={selectedRole.name} onChange={(e) => (selectedRole.name = e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" defaultValue={selectedRole.description || ""} onChange={(e) => (selectedRole.description = e.target.value)} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="active" defaultChecked={selectedRole.is_active} onCheckedChange={(v) => (selectedRole.is_active = v)} />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedRole) {
                  updateRoleMutation.mutate({
                    id: selectedRole.id,
                    data: { name: selectedRole.name, description: selectedRole.description, is_active: selectedRole.is_active },
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}
