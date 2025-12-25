import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'transaction';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/notifications/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type as NotificationType,
          timestamp: n.createdAt,
          read: n.read,
          link: n.link,
        }));
        setNotifications(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!user?.id) {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
        }),
      });
      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, { 
        method: 'PATCH',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`/api/notifications/${user.id}/read-all`, { 
        method: 'PATCH',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const clearAll = async () => {
    if (!user?.id) return;
    setNotifications([]);
    try {
      await fetch(`/api/notifications/user/${user.id}`, { 
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const refreshNotifications = fetchNotifications;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead, 
      clearAll,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
