import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, BellOff, Check, CheckCheck, Trash2, Loader2,
  Wallet, Database, TrendingUp, Shield, CreditCard, 
  AlertCircle, Info, CheckCircle, XCircle, Clock,
  RefreshCw, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  userId: string;
  type: 'transaction' | 'kyc' | 'bnsl' | 'vault' | 'security' | 'system' | 'referral';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/notifications`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/notifications/read-all`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <Wallet className="w-5 h-5" />;
      case 'kyc': return <Shield className="w-5 h-5" />;
      case 'bnsl': return <TrendingUp className="w-5 h-5" />;
      case 'vault': return <Database className="w-5 h-5" />;
      case 'security': return <Shield className="w-5 h-5" />;
      case 'referral': return <CheckCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'bg-blue-500/10 text-blue-500';
      case 'kyc': return 'bg-purple-500/10 text-purple-500';
      case 'bnsl': return 'bg-green-500/10 text-green-500';
      case 'vault': return 'bg-yellow-500/10 text-yellow-500';
      case 'security': return 'bg-red-500/10 text-red-500';
      case 'referral': return 'bg-pink-500/10 text-pink-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-100 text-red-700">Urgent</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700">Important</Badge>;
      default: return null;
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-primary text-white">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Stay updated on your account activity</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              data-testid="button-refresh-notifications"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            {unreadCount > 0 && (
              <Button 
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter('all')} data-testid="filter-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">All</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter('unread')} data-testid="filter-unread">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BellOff className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter('transaction')} data-testid="filter-transactions">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.type === 'transaction').length}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter('security')} data-testid="filter-security">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.type === 'security').length}</p>
                <p className="text-xs text-muted-foreground">Security</p>
              </div>
            </div>
          </Card>
        </div>

        <Card data-testid="card-notifications-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {filter === 'all' ? 'All Notifications' : 
                 filter === 'unread' ? 'Unread Notifications' :
                 `${filter.charAt(0).toUpperCase() + filter.slice(1)} Notifications`}
              </CardTitle>
              {filter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={`p-4 rounded-lg border transition-all ${
                        notification.isRead ? 'bg-muted/30 border-border' : 'bg-primary/5 border-primary/20'
                      }`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getTypeColor(notification.type)}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </h4>
                                {getPriorityBadge(notification.priority)}
                                {!notification.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.isRead && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => markAsReadMutation.mutate(notification.id)}
                                  data-testid={`button-mark-read-${notification.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                data-testid={`button-delete-${notification.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? "You're all caught up! Check back later for updates."
                    : "No notifications match this filter."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
