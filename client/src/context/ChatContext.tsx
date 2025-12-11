import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  sender: 'user' | 'admin' | 'agent';
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  messages: Message[];
  status: 'active' | 'closed';
  lastMessageAt: Date;
  unreadCount: number;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  sendMessage: (content: string, sender: 'user' | 'admin' | 'agent', sessionId?: string) => void;
  createSession: (userId: string, userName: string) => string;
  selectSession: (sessionId: string) => void;
  markAsRead: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Mock initial data
  useEffect(() => {
    // Only add mock data if empty
    if (sessions.length === 0) {
      const mockSessions: ChatSession[] = [
        {
          id: 'session-1',
          userId: 'user-1',
          userName: 'Sarah Johnson',
          messages: [
            {
              id: 'msg-1',
              sender: 'user',
              content: 'Hi, I have a question about my gold storage fees.',
              timestamp: new Date(Date.now() - 1000 * 60 * 60),
              isRead: true
            },
            {
              id: 'msg-2',
              sender: 'agent',
              content: 'Hello Sarah! I can help with that. What specifically would you like to know?',
              timestamp: new Date(Date.now() - 1000 * 60 * 59),
              isRead: true
            },
            {
              id: 'msg-3',
              sender: 'user',
              content: 'Are the fees calculated daily or monthly?',
              timestamp: new Date(Date.now() - 1000 * 60 * 5),
              isRead: false
            }
          ],
          status: 'active',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
          unreadCount: 1
        },
        {
          id: 'session-2',
          userId: 'user-2',
          userName: 'TechCorp Solutions',
          messages: [
            {
              id: 'msg-4',
              sender: 'user',
              content: 'We need to increase our daily transaction limit.',
              timestamp: new Date(Date.now() - 1000 * 60 * 120),
              isRead: true
            }
          ],
          status: 'active',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 120),
          unreadCount: 1
        }
      ];
      setSessions(mockSessions);
    }
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createSession = (userId: string, userName: string) => {
    const existingSession = sessions.find(s => s.userId === userId && s.status === 'active');
    if (existingSession) return existingSession.id;

    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      userId,
      userName,
      messages: [],
      status: 'active',
      lastMessageAt: new Date(),
      unreadCount: 0
    };

    setSessions(prev => [newSession, ...prev]);
    return newSession.id;
  };

  const sendMessage = (content: string, sender: 'user' | 'admin' | 'agent', sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;
    if (!targetSessionId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender,
      content,
      timestamp: new Date(),
      isRead: false
    };

    setSessions(prev => prev.map(session => {
      if (session.id === targetSessionId) {
        return {
          ...session,
          messages: [...session.messages, newMessage],
          lastMessageAt: new Date(),
          unreadCount: sender === 'user' ? session.unreadCount + 1 : session.unreadCount
        };
      }
      return session;
    }));
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    markAsRead(sessionId);
  };

  const markAsRead = (sessionId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          unreadCount: 0,
          messages: session.messages.map(m => ({ ...m, isRead: true }))
        };
      }
      return session;
    }));
  };

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      sendMessage,
      createSession,
      selectSession,
      markAsRead
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
