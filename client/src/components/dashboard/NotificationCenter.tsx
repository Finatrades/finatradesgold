import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Info, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft, Wallet, Database, TrendingUp, Shield, RefreshCw, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  userId: string;
  type: 'transaction' | 'kyc' | 'bnsl' | 'vault' | 'security' | 'system' | 'referral';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/notifications`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: isOpen ? 30000 : 120000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { 
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/notifications/read-all`, { 
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, { 
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <Wallet className="w-4 h-4 text-blue-500" />;
      case 'kyc': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'bnsl': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'vault': return <Database className="w-4 h-4 text-yellow-500" />;
      case 'security': return <Shield className="w-4 h-4 text-red-500" />;
      case 'referral': return <CheckCircle2 className="w-4 h-4 text-pink-500" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-secondary" />;
    }
  };

  const getPriorityDot = (priority: string) => {
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-yellow-500';
    return null;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
        data-testid="button-notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center" data-testid="badge-unread-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-[360px] md:w-[420px] bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-white text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => refetch()}
                  title="Refresh"
                  data-testid="button-refresh-notifications"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    title="Mark all as read"
                    data-testid="button-mark-all-read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {['all', 'unread', 'transaction', 'security', 'system'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      filter === f 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`filter-${f}`}
                  >
                    {f === 'all' ? 'All' : 
                     f === 'unread' ? `Unread (${unreadCount})` :
                     f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm mt-1">
                    {filter === 'all' ? "You're all caught up!" : "No notifications match this filter"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border" data-testid="notification-list">
                  <AnimatePresence>
                    {filteredNotifications.map((notification) => (
                      <motion.div 
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`p-3 hover:bg-muted/50 transition-colors group ${!notification.read ? 'bg-primary/5' : ''}`}
                        data-testid={`notification-item-${notification.id}`}
                      >
                        <div className="flex gap-3">
                          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                                {getPriorityDot(notification.priority) && (
                                  <span className={`w-2 h-2 rounded-full ${getPriorityDot(notification.priority)} shrink-0`} />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!notification.read && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsReadMutation.mutate(notification.id);
                                    }}
                                    title="Mark as read"
                                    data-testid={`button-mark-read-${notification.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotificationMutation.mutate(notification.id);
                                  }}
                                  title="Delete"
                                  data-testid={`button-delete-${notification.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredNotifications.length} of {notifications.length} notifications
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
