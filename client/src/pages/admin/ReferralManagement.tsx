import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, RefreshCw, Users, Gift, DollarSign, CheckCircle, Clock, XCircle, Eye, Edit, Copy } from 'lucide-react';

interface Referral {
  id: string;
  referrerId: string;
  referredId?: string;
  referralCode: string;
  referredEmail?: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Expired' | 'Cancelled';
  rewardAmount?: string;
  rewardCurrency?: string;
  rewardPaidAt?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function ReferralManagement() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    rewardAmount: '',
    notes: '',
  });

  const fetchReferrals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/referrals');
      const data = await response.json();
      setReferrals(data.referrals || []);
      
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      const usersMap: Record<string, User> = {};
      (usersData.users || []).forEach((user: User) => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);
    } catch (error) {
      toast.error("Failed to load referrals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleEditReferral = (referral: Referral) => {
    setSelectedReferral(referral);
    setEditForm({
      status: referral.status,
      rewardAmount: referral.rewardAmount || '0',
      notes: referral.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveReferral = async () => {
    if (!selectedReferral) return;
    
    try {
      const updates: any = {
        status: editForm.status,
        rewardAmount: editForm.rewardAmount,
        notes: editForm.notes,
      };
      
      if (editForm.status === 'Completed' && selectedReferral.status !== 'Completed') {
        updates.completedAt = new Date().toISOString();
        if (parseFloat(editForm.rewardAmount) > 0) {
          updates.rewardPaidAt = new Date().toISOString();
        }
      }
      
      const response = await fetch(`/api/admin/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      toast.success("Referral updated successfully");
      setIsEditModalOpen(false);
      fetchReferrals();
    } catch (error) {
      toast.error("Failed to update referral");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Referral code copied!");
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Active': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Expired': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.referralCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referredEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      users[referral.referrerId]?.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: referrals.length,
    active: referrals.filter(r => r.status === 'Active').length,
    completed: referrals.filter(r => r.status === 'Completed').length,
    totalRewards: referrals
      .filter(r => r.rewardPaidAt)
      .reduce((sum, r) => sum + parseFloat(r.rewardAmount || '0'), 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
              Referral Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track and manage user referrals and rewards
            </p>
          </div>
          <Button onClick={fetchReferrals} variant="outline" data-testid="btn-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="stat-total">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-active">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-completed">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-rewards">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rewards Paid</p>
                  <p className="text-2xl font-bold">${stats.totalRewards.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <CardTitle>All Referrals</CardTitle>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by code or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="referrals-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Referral Code</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Referrer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Referred</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Reward</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((referral) => {
                      const referrer = users[referral.referrerId];
                      const referred = referral.referredId ? users[referral.referredId] : null;
                      
                      return (
                        <tr key={referral.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-referral-${referral.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">
                                {referral.referralCode}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(referral.referralCode)}
                                data-testid={`btn-copy-${referral.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {referrer ? (
                              <div>
                                <p className="font-medium">{referrer.firstName} {referrer.lastName}</p>
                                <p className="text-sm text-gray-500">{referrer.email}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unknown</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {referred ? (
                              <div>
                                <p className="font-medium">{referred.firstName} {referred.lastName}</p>
                                <p className="text-sm text-gray-500">{referred.email}</p>
                              </div>
                            ) : referral.referredEmail ? (
                              <span className="text-gray-500">{referral.referredEmail}</span>
                            ) : (
                              <span className="text-gray-400">Not used yet</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(referral.status)}
                          </td>
                          <td className="py-3 px-4">
                            {parseFloat(referral.rewardAmount || '0') > 0 ? (
                              <div>
                                <p className="font-medium">${parseFloat(referral.rewardAmount || '0').toFixed(2)}</p>
                                {referral.rewardPaidAt && (
                                  <p className="text-xs text-green-600">Paid</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditReferral(referral)}
                              data-testid={`btn-edit-${referral.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Referral</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger data-testid="edit-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reward Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.rewardAmount}
                  onChange={(e) => setEditForm({ ...editForm, rewardAmount: e.target.value })}
                  data-testid="edit-reward-input"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Add admin notes..."
                  data-testid="edit-notes-textarea"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveReferral} data-testid="btn-save-referral">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
