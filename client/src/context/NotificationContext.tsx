import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Mock initial notifications
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Welcome to Finatrades',
    message: 'Your account has been successfully created. Complete your profile to unlock full features.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true
  },
  {
    id: 'notif-2',
    title: 'Gold Price Alert',
    message: 'Gold has reached a new high of $2,350.40/oz.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false
  },
  {
    id: 'notif-3',
    title: 'Security Update',
    message: 'New login detected from Dubai, UAE.',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false
  }
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead, 
      clearAll 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
