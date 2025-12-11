import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Ban, Edit, Trash, Eye, CheckCircle, Unlock, Loader2, Users } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useUserManagement } from '@/context/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserManagement() {
  const { users, isLoading, updateUserStatus, updateUserKYC } = useUserManagement();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage platform users, roles, and permissions.</p>
          </div>
          <Button>Add New User</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No users found</p>
                <p className="text-sm">Users who register will appear here</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">KYC Level</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">{user.role}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.status === 'Active' ? 'default' : user.status === 'Suspended' || user.status === 'Frozen' ? 'destructive' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant="outline">Level {user.kycLevel}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.joinedDate}</td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            
                            {user.status !== 'Active' && (
                               <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'Active')}>
                                 <CheckCircle className="w-4 h-4 mr-2" /> Activate User
                               </DropdownMenuItem>
                            )}
                            
                            {user.status === 'Active' && (
                               <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'Suspended')}>
                                 <Ban className="w-4 h-4 mr-2" /> Suspend User
                               </DropdownMenuItem>
                            )}
                            
                            {user.kycLevel < 2 && (
                               <DropdownMenuItem onClick={() => updateUserKYC(user.id, (user.kycLevel + 1) as any)}>
                                 <CheckCircle className="w-4 h-4 mr-2" /> Upgrade KYC
                               </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600"><Trash className="w-4 h-4 mr-2" /> Delete Account</DropdownMenuItem>
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
      </div>
    </AdminLayout>
  );
}