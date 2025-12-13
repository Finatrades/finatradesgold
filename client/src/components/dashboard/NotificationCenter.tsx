import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, Info, CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, Notification, NotificationType } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'transaction': return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-secondary" />;
    }
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
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-background animate-pulse" data-testid="badge-unread-count" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  data-testid="button-mark-all-read"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={clearAll}
                  title="Clear all"
                  data-testid="button-clear-all-notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* List */}
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mb-3 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border" data-testid="notification-list">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 transition-colors flex gap-4 cursor-pointer ${!notification.read ? 'bg-secondary/5' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                            {notification.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="shrink-0 self-center">
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
