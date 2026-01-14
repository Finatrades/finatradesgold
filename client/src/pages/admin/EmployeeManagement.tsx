import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Users, Plus, Search, Filter, MoreVertical, Shield, 
  UserCheck, UserX, Edit, Trash2, RefreshCw 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';

const EMPLOYEE_ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-purple-500' },
  { value: 'admin', label: 'Admin', color: 'bg-blue-500' },
  { value: 'manager', label: 'Manager', color: 'bg-green-500' },
  { value: 'support', label: 'Support', color: 'bg-yellow-500' },
  { value: 'finance', label: 'Finance', color: 'bg-purple-500' },
  { value: 'compliance', label: 'Compliance', color: 'bg-red-500' },
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'manage_users', 'view_users', 'manage_employees', 'manage_kyc', 'view_kyc',
    'manage_transactions', 'view_transactions', 'manage_withdrawals', 'manage_deposits',
    'manage_vault', 'view_vault', 'manage_bnsl', 'view_bnsl', 'manage_finabridge', 'view_finabridge',
    'manage_support', 'view_support', 'manage_cms', 'view_cms', 'manage_settings',
    'view_reports', 'generate_reports', 'manage_fees'
  ],
  admin: [
    'manage_users', 'view_users', 'manage_employees', 'manage_kyc', 'view_kyc',
    'manage_transactions', 'view_transactions', 'manage_withdrawals', 'manage_deposits',
    'manage_vault', 'view_vault', 'manage_bnsl', 'view_bnsl', 'manage_finabridge', 'view_finabridge',
    'manage_support', 'view_support', 'view_reports', 'generate_reports'
  ],
  manager: [
    'view_users', 'view_kyc', 'view_transactions', 'view_vault', 'view_bnsl',
    'view_finabridge', 'manage_support', 'view_support', 'view_reports'
  ],
  support: [
    'view_users', 'view_kyc', 'view_transactions', 'manage_support', 'view_support'
  ],
  finance: [
    'view_users', 'manage_transactions', 'view_transactions', 'manage_withdrawals',
    'manage_deposits', 'view_vault', 'view_bnsl', 'view_reports', 'generate_reports', 'manage_fees'
  ],
  compliance: [
    'view_users', 'manage_kyc', 'view_kyc', 'view_transactions', 'view_vault',
    'view_bnsl', 'view_finabridge', 'view_reports', 'generate_reports'
  ],
};

const AVAILABLE_PERMISSIONS = [
  { key: 'manage_users', label: 'Manage Users', category: 'Users' },
  { key: 'view_users', label: 'View Users', category: 'Users' },
  { key: 'manage_employees', label: 'Manage Employees', category: 'Employees' },
  { key: 'manage_kyc', label: 'Manage KYC', category: 'KYC' },
  { key: 'view_kyc', label: 'View KYC', category: 'KYC' },
  { key: 'manage_transactions', label: 'Manage Transactions', category: 'Transactions' },
  { key: 'view_transactions', label: 'View Transactions', category: 'Transactions' },
  { key: 'manage_withdrawals', label: 'Manage Withdrawals', category: 'Transactions' },
  { key: 'manage_deposits', label: 'Manage Deposits', category: 'Transactions' },
  { key: 'manage_vault', label: 'Manage Vault', category: 'Vault' },
  { key: 'view_vault', label: 'View Vault', category: 'Vault' },
  { key: 'manage_bnsl', label: 'Manage BNSL', category: 'BNSL' },
  { key: 'view_bnsl', label: 'View BNSL', category: 'BNSL' },
  { key: 'manage_finabridge', label: 'Manage FinaBridge', category: 'FinaBridge' },
  { key: 'view_finabridge', label: 'View FinaBridge', category: 'FinaBridge' },
  { key: 'manage_support', label: 'Manage Support', category: 'Support' },
  { key: 'view_support', label: 'View Support', category: 'Support' },
  { key: 'manage_cms', label: 'Manage CMS', category: 'CMS' },
  { key: 'view_cms', label: 'View CMS', category: 'CMS' },
  { key: 'manage_settings', label: 'Manage Settings', category: 'Settings' },
  { key: 'view_reports', label: 'View Reports', category: 'Reports' },
  { key: 'generate_reports', label: 'Generate Reports', category: 'Reports' },
  { key: 'manage_fees', label: 'Manage Fees', category: 'Fees' },
];

interface Employee {
  id: string;
  employeeId: string;
  userId: string | null;
  role: string;
  department: string | null;
  jobTitle: string | null;
  status: string;
  permissions: string[] | null;
  hiredAt: string;
  lastActiveAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePhoto: string | null;
  } | null;
}

export default function EmployeeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({
    userId: '',
    role: 'support',
    department: '',
    jobTitle: '',
    permissions: ROLE_DEFAULT_PERMISSIONS['support'] || [] as string[],
  });

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['/api/admin/employees'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    }
  });

  const { data: usersData } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest('POST', '/api/admin/employees', { ...data, createdBy: user?.id });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create employee');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast.success('Employee created successfully');
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await apiRequest('PATCH', `/api/admin/employees/${id}`, { ...data, updatedBy: user?.id });
      if (!res.ok) throw new Error('Failed to update employee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast.success('Employee updated successfully');
      setShowEditDialog(false);
      setSelectedEmployee(null);
    },
    onError: () => {
      toast.error('Failed to update employee');
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/employees/${id}/deactivate`, { adminId: user?.id });
      if (!res.ok) throw new Error('Failed to deactivate employee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast.success('Employee deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate employee');
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/employees/${id}/activate`, { adminId: user?.id });
      if (!res.ok) throw new Error('Failed to activate employee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast.success('Employee activated');
    },
    onError: () => {
      toast.error('Failed to activate employee');
    }
  });

  const resetForm = () => {
    setFormData({
      userId: '',
      role: 'support',
      department: '',
      jobTitle: '',
      permissions: ROLE_DEFAULT_PERMISSIONS['support'] || [],
    });
  };

  const handleRoleChange = (role: string) => {
    const defaultPermissions = ROLE_DEFAULT_PERMISSIONS[role] || [];
    setFormData(prev => ({ 
      ...prev, 
      role,
      permissions: defaultPermissions 
    }));
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      userId: employee.userId || '',
      role: employee.role,
      department: employee.department || '',
      jobTitle: employee.jobTitle || '',
      permissions: employee.permissions || [],
    });
    setShowEditDialog(true);
  };

  const MANAGE_VIEW_PAIRS: Record<string, string> = {
    'manage_users': 'view_users',
    'manage_kyc': 'view_kyc',
    'manage_transactions': 'view_transactions',
    'manage_vault': 'view_vault',
    'manage_bnsl': 'view_bnsl',
    'manage_finabridge': 'view_finabridge',
    'manage_support': 'view_support',
    'manage_cms': 'view_cms',
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => {
      let newPermissions: string[];
      
      if (prev.permissions.includes(permission)) {
        newPermissions = prev.permissions.filter(p => p !== permission);
      } else {
        newPermissions = [...prev.permissions, permission];
        
        if (permission.startsWith('manage_')) {
          const viewPermission = MANAGE_VIEW_PAIRS[permission];
          if (viewPermission && !newPermissions.includes(viewPermission)) {
            newPermissions.push(viewPermission);
          }
        }
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const isFormValid = formData.permissions.length > 0;

  const employees: Employee[] = employeesData?.employees || [];
  const availableUsers = usersData?.users?.filter((u: any) => 
    !employees.some(e => e.userId === u.id)
  ) || [];

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      emp.employeeId.toLowerCase().includes(searchLower) ||
      (emp.user?.email?.toLowerCase()?.includes(searchLower) ?? false) ||
      (emp.user?.firstName?.toLowerCase()?.includes(searchLower) ?? false) ||
      (emp.user?.lastName?.toLowerCase()?.includes(searchLower) ?? false);
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    const roleConfig = EMPLOYEE_ROLES.find(r => r.value === role);
    return roleConfig?.color || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage team members and their access permissions</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-employee" className="bg-purple-500 hover:bg-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee account with role-based permissions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Link to User Account (Optional)</Label>
                  <Select value={formData.userId} onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}>
                    <SelectTrigger data-testid="select-user">
                      <SelectValue placeholder="Select a user to link" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      data-testid="input-department"
                      placeholder="e.g., Operations"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    data-testid="input-job-title"
                    placeholder="e.g., Customer Support Specialist"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <div key={perm.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.key}
                            checked={formData.permissions.includes(perm.key)}
                            onCheckedChange={() => togglePermission(perm.key)}
                          />
                          <label htmlFor={perm.key} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {!isFormValid && (
                <p className="text-sm text-destructive">At least one permission is required</p>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  data-testid="button-create-employee"
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending || !isFormValid}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  data-testid="input-search-employees"
                  placeholder="Search employees..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40" data-testid="filter-role">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {EMPLOYEE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36" data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No employees found</h3>
                <p className="text-gray-500">Add your first employee to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Hired</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50" data-testid={`row-employee-${employee.id}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.user?.profilePhoto || ''} />
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {employee.user ? 
                                  `${employee.user.firstName[0]}${employee.user.lastName[0]}` : 
                                  employee.employeeId.slice(-2)
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee.user ? `${employee.user.firstName} ${employee.user.lastName}` : 'Unlinked'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {employee.user?.email || employee.jobTitle || '-'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{employee.employeeId}</code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getRoleBadgeColor(employee.role)} text-white`}>
                            {EMPLOYEE_ROLES.find(r => r.value === employee.role)?.label || employee.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{employee.department || '-'}</td>
                        <td className="py-3 px-4">{getStatusBadge(employee.status)}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {new Date(employee.hiredAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${employee.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {employee.status === 'active' ? (
                                <DropdownMenuItem 
                                  onClick={() => deactivateMutation.mutate(employee.id)}
                                  className="text-red-600"
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => activateMutation.mutate(employee.id)}>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee details and permissions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger data-testid="edit-select-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    data-testid="edit-input-department"
                    placeholder="e.g., Operations"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-jobTitle">Job Title</Label>
                <Input
                  id="edit-jobTitle"
                  data-testid="edit-input-job-title"
                  placeholder="e.g., Customer Support Specialist"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <div key={perm.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${perm.key}`}
                          checked={formData.permissions.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                        <label htmlFor={`edit-${perm.key}`} className="text-sm cursor-pointer">
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {!isFormValid && (
              <p className="text-sm text-destructive">At least one permission is required</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedEmployee(null); }}>
                Cancel
              </Button>
              <Button 
                data-testid="button-update-employee"
                onClick={() => selectedEmployee && updateMutation.mutate({ 
                  id: selectedEmployee.id, 
                  data: formData 
                })}
                disabled={updateMutation.isPending || !isFormValid}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
