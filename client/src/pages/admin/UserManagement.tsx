import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Ban, Trash, Eye, CheckCircle, Mail, Shield, UserCheck, UserX, RefreshCw, Search, Users, Building, User } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import AdminOtpModal, { checkOtpRequired } from '@/components/admin/AdminOtpModal';
import { useAdminOtp } from '@/hooks/useAdminOtp';
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
  finatradesId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companyName?: string;
  registrationNumber?: string;
  profilePhoto?: string;
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
  const { isOtpModalOpen, pendingAction, requestOtp, handleVerified, closeOtpModal } = useAdminOtp();

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
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
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

  const performSuspendUser = async (userId: string) => {
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

  const performActivateUser = async (userId: string) => {
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

  const handleSuspendUser = async (userId: string) => {
    if (!currentUser?.id) return;
    const otpRequired = await checkOtpRequired('user_suspension', currentUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'user_suspension',
        targetId: userId,
        targetType: 'user',
        onComplete: () => performSuspendUser(userId),
      });
    } else {
      performSuspendUser(userId);
    }
  };

  const handleActivateUser = async (userId: string) => {
    if (!currentUser?.id) return;
    const otpRequired = await checkOtpRequired('user_activation', currentUser.id);
    if (otpRequired) {
      requestOtp({
        actionType: 'user_activation',
        targetId: userId,
        targetType: 'user',
        onComplete: () => performActivateUser(userId),
      });
    } else {
      performActivateUser(userId);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.finatradesId && user.finatradesId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: users.length,
    verified: users.filter(u => u.isEmailVerified).length,
    pending: users.filter(u => !u.isEmailVerified).length,
    admins: users.filter(u => u.role === 'admin').length,
    personal: users.filter(u => u.accountType === 'personal').length,
    corporate: users.filter(u => u.accountType === 'business').length
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold" data-testid="text-total-users">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Personal</p>
                  <p className="text-xl font-bold" data-testid="text-personal-users">{stats.personal}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Corporate</p>
                  <p className="text-xl font-bold" data-testid="text-corporate-users">{stats.corporate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Mail className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Verified</p>
                  <p className="text-xl font-bold" data-testid="text-verified-users">{stats.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <UserX className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-xl font-bold" data-testid="text-pending-users">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Admins</p>
                  <p className="text-xl font-bold" data-testid="text-admin-users">{stats.admins}</p>
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
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold tracking-wide">Finatrades ID</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Name</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Email</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Phone</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Email Status</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Role</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Account Type</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">KYC Status</th>
                      <th className="px-6 py-4 font-semibold tracking-wide">Joined</th>
                      <th className="px-6 py-4 font-semibold tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-gray-300" />
                            <span>No users found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <tr 
                          key={user.id} 
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/50 transition-colors duration-150 group`} 
                          data-testid={`row-user-${user.id}`}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded" data-testid={`text-finatrades-id-${user.id}`}>
                              {user.finatradesId || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.profilePhoto ? (
                                <img 
                                  src={user.profilePhoto} 
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                  {user.firstName[0]}{user.lastName[0]}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4 text-gray-500">{user.phoneNumber || '-'}</td>
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
                          <td className="px-6 py-4">
                            <div>
                              {user.accountType === 'business' ? (
                                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                                  <Building className="w-3 h-3 mr-1" /> Corporate
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                                  <User className="w-3 h-3 mr-1" /> Personal
                                </Badge>
                              )}
                              {user.accountType === 'business' && user.companyName && (
                                <div className="text-xs text-gray-500 mt-1">{user.companyName}</div>
                              )}
                            </div>
                          </td>
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

        {/* Admin OTP Verification Modal */}
        {pendingAction && currentUser?.id && (
          <AdminOtpModal
            isOpen={isOtpModalOpen}
            onClose={closeOtpModal}
            onVerified={handleVerified}
            actionType={pendingAction.actionType}
            targetId={pendingAction.targetId}
            targetType={pendingAction.targetType}
            actionData={pendingAction.actionData}
            adminUserId={currentUser.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}
