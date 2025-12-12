import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Ban, Trash, Eye, CheckCircle, Mail, Shield, UserCheck, UserX, RefreshCw, Search, Users } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  accountType: 'personal' | 'business';
  kycStatus: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerifyEmail = async (userId: string) => {
    try {
      await apiRequest('POST', `/api/admin/users/${userId}/verify-email`, {
        adminId: currentUser?.id
      });
      toast.success("Email verified successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to verify email");
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      await apiRequest('POST', `/api/admin/users/${userId}/suspend`, {
        adminId: currentUser?.id,
        reason: 'Admin action'
      });
      toast.success("User suspended");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to suspend user");
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await apiRequest('POST', `/api/admin/users/${userId}/activate`, {
        adminId: currentUser?.id
      });
      toast.success("User activated");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to activate user");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    verified: users.filter(u => u.isEmailVerified).length,
    pending: users.filter(u => !u.isEmailVerified).length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage platform users, email verification, and permissions.</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="icon" data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold" data-testid="text-total-users">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Verified</p>
                  <p className="text-2xl font-bold" data-testid="text-verified-users">{stats.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <UserX className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Verification</p>
                  <p className="text-2xl font-bold" data-testid="text-pending-users">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admin Users</p>
                  <p className="text-2xl font-bold" data-testid="text-admin-users">{stats.admins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Email Status</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Account Type</th>
                      <th className="px-6 py-3">KYC Status</th>
                      <th className="px-6 py-3">Joined</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50" data-testid={`row-user-${user.id}`}>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4">
                            {user.isEmailVerified ? (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <Mail className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                              {user.role === 'admin' ? (
                                <><Shield className="w-3 h-3 mr-1" /> Admin</>
                              ) : (
                                'User'
                              )}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 capitalize">{user.accountType}</td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                user.kycStatus === 'Approved' ? 'default' : 
                                user.kycStatus === 'Rejected' ? 'destructive' : 
                                'secondary'
                              }
                            >
                              {user.kycStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${user.id}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <Link href={`/admin/users/${user.id}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                </Link>
                                
                                {!user.isEmailVerified && (
                                  <DropdownMenuItem 
                                    onClick={() => handleVerifyEmail(user.id)}
                                    className="cursor-pointer"
                                    data-testid={`button-verify-${user.id}`}
                                  >
                                    <UserCheck className="w-4 h-4 mr-2" /> Verify Email
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                {user.kycStatus !== 'Approved' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleActivateUser(user.id)}
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Activate User
                                  </DropdownMenuItem>
                                )}
                                
                                {user.kycStatus !== 'Rejected' && user.role !== 'admin' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleSuspendUser(user.id)}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <Ban className="w-4 h-4 mr-2" /> Suspend User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
