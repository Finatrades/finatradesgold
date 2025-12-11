import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

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
  isOnline?: boolean;
}

interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callType: 'audio' | 'video';
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  sendMessage: (content: string, sender: 'user' | 'admin' | 'agent', sessionId?: string) => void;
  createSession: (userId: string, userName: string) => string;
  selectSession: (sessionId: string) => void;
  markAsRead: (sessionId: string) => void;
  isConnected: boolean;
  isTyping: { [sessionId: string]: boolean };
  setTyping: (sessionId: string, isTyping: boolean) => void;
  incomingCall: IncomingCall | null;
  initiateCall: (sessionId: string, callType: 'audio' | 'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  activeCall: { sessionId: string; callType: 'audio' | 'video' } | null;
  startGuestSession: (name: string, email: string) => string;
  guestId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTypingState] = useState<{ [sessionId: string]: boolean }>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{ sessionId: string; callType: 'audio' | 'video' } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isGuestReady, setIsGuestReady] = useState(false);

  // Generate guest ID on mount if no user
  useEffect(() => {
    if (!user && !guestId) {
      const storedGuestId = sessionStorage.getItem('finatrades_guest_id');
      if (storedGuestId) {
        setGuestId(storedGuestId);
      } else {
        const newGuestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('finatrades_guest_id', newGuestId);
        setGuestId(newGuestId);
      }
    }
  }, [user, guestId]);

  // Initialize socket connection for authenticated users or when guest is ready
  useEffect(() => {
    const userId = user?.id || (isGuestReady ? guestId : null);
    if (!userId) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Get stored guest info if available
      const storedGuestName = sessionStorage.getItem('finatrades_guest_name');
      const storedGuestEmail = sessionStorage.getItem('finatrades_guest_email');
      
      // Join with user info
      socket.emit('join', {
        userId: userId,
        role: user?.role || 'guest',
        guestName: storedGuestName || undefined,
        guestEmail: storedGuestEmail || undefined,
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('joined', (data: { sessionId: string }) => {
      console.log('Joined session:', data.sessionId);
      // Load messages for this session only if sessionId is defined
      if (data.sessionId) {
        loadSessionMessages(data.sessionId);
      }
    });

    // Handle incoming messages
    socket.on('chat:message', (message: any) => {
      setSessions(prev => prev.map(session => {
        if (session.id === message.sessionId) {
          const newMessage: Message = {
            id: message.id,
            sender: message.sender,
            content: message.content,
            timestamp: new Date(message.createdAt),
            isRead: message.isRead,
          };
          return {
            ...session,
            messages: [...session.messages, newMessage],
            lastMessageAt: new Date(),
            unreadCount: message.sender === 'user' ? session.unreadCount + 1 : session.unreadCount,
          };
        }
        return session;
      }));
    });

    // Handle typing indicator
    socket.on('chat:typing', (data: { sessionId: string; userId: string; isTyping: boolean }) => {
      setIsTypingState(prev => ({
        ...prev,
        [data.sessionId]: data.isTyping,
      }));
    });

    // Handle read receipts
    socket.on('chat:read', (data: { sessionId: string }) => {
      setSessions(prev => prev.map(session => {
        if (session.id === data.sessionId) {
          return {
            ...session,
            unreadCount: 0,
            messages: session.messages.map(m => ({ ...m, isRead: true })),
          };
        }
        return session;
      }));
    });

    // Handle user online/offline status (for admin)
    socket.on('user:online', (data: { userId: string; sessionId: string }) => {
      setSessions(prev => prev.map(session => {
        if (session.userId === data.userId) {
          return { ...session, isOnline: true };
        }
        return session;
      }));
    });

    socket.on('user:offline', (data: { userId: string }) => {
      setSessions(prev => prev.map(session => {
        if (session.userId === data.userId) {
          return { ...session, isOnline: false };
        }
        return session;
      }));
    });

    // Handle call events
    socket.on('call:incoming', (data: IncomingCall) => {
      setIncomingCall(data);
    });

    socket.on('call:accepted', (data: { sessionId: string; accepterId: string }) => {
      // Call was accepted, start the call UI
      console.log('Call accepted');
    });

    socket.on('call:rejected', (data: { sessionId: string; rejecterId: string }) => {
      setActiveCall(null);
      setIncomingCall(null);
    });

    socket.on('call:ended', (data: { sessionId: string }) => {
      setActiveCall(null);
      setIncomingCall(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, isGuestReady, guestId]);

  // Load sessions on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllSessions();
    }
  }, [user]);

  const loadAllSessions = async () => {
    try {
      const response = await fetch('/api/admin/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        const formattedSessions: ChatSession[] = await Promise.all(
          data.sessions.map(async (session: any) => {
            const messagesResponse = await fetch(`/api/chat/messages/${session.id}`);
            const messagesData = messagesResponse.ok ? await messagesResponse.json() : { messages: [] };
            
            return {
              id: session.id,
              userId: session.userId,
              userName: session.userId,
              messages: messagesData.messages.map((m: any) => ({
                id: m.id,
                sender: m.sender,
                content: m.content,
                timestamp: new Date(m.createdAt),
                isRead: m.isRead,
              })),
              status: session.status,
              lastMessageAt: new Date(session.lastMessageAt),
              unreadCount: messagesData.messages.filter((m: any) => !m.isRead && m.sender === 'user').length,
              isOnline: false,
            };
          })
        );
        setSessions(formattedSessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(prev => {
          const existingSession = prev.find(s => s.id === sessionId);
          if (existingSession) {
            return prev.map(session => {
              if (session.id === sessionId) {
                return {
                  ...session,
                  messages: data.messages.map((m: any) => ({
                    id: m.id,
                    sender: m.sender,
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                    isRead: m.isRead,
                  })),
                };
              }
              return session;
            });
          } else {
            // Create new session entry
            return [...prev, {
              id: sessionId,
              userId: user?.id || '',
              userName: user ? `${user.firstName} ${user.lastName}` : 'User',
              messages: data.messages.map((m: any) => ({
                id: m.id,
                sender: m.sender,
                content: m.content,
                timestamp: new Date(m.createdAt),
                isRead: m.isRead,
              })),
              status: 'active' as const,
              lastMessageAt: new Date(),
              unreadCount: 0,
            }];
          }
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

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
      unreadCount: 0,
    };

    setSessions(prev => [newSession, ...prev]);
    return newSession.id;
  };

  const startGuestSession = useCallback((name: string, email: string) => {
    if (!guestId) return '';
    
    setIsGuestReady(true);
    
    const sessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: sessionId,
      userId: guestId,
      userName: name,
      messages: [],
      status: 'active',
      lastMessageAt: new Date(),
      unreadCount: 0,
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    
    sessionStorage.setItem('finatrades_guest_name', name);
    sessionStorage.setItem('finatrades_guest_email', email);
    
    return sessionId;
  }, [guestId]);

  const sendMessage = useCallback((content: string, sender: 'user' | 'admin' | 'agent', sessionId?: string) => {
    const targetSessionId = sessionId || currentSessionId;
    if (!targetSessionId || !socketRef.current) return;

    // Send via socket
    socketRef.current.emit('chat:message', {
      sessionId: targetSessionId,
      content,
      sender,
      userId: user?.id || guestId,
    });

    // Optimistically add message to local state
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender,
      content,
      timestamp: new Date(),
      isRead: false,
    };

    setSessions(prev => prev.map(session => {
      if (session.id === targetSessionId) {
        return {
          ...session,
          messages: [...session.messages, newMessage],
          lastMessageAt: new Date(),
        };
      }
      return session;
    }));
  }, [currentSessionId, user]);

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    markAsRead(sessionId);
    
    // Join session room via socket
    if (socketRef.current) {
      socketRef.current.emit('join-session', { sessionId });
    }
  };

  const markAsRead = useCallback((sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:read', { sessionId });
    }
    
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          unreadCount: 0,
          messages: session.messages.map(m => ({ ...m, isRead: true })),
        };
      }
      return session;
    }));
  }, []);

  const setTyping = useCallback((sessionId: string, typing: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:typing', {
        sessionId,
        userId: user?.id,
        isTyping: typing,
      });
    }
  }, [user]);

  const initiateCall = useCallback((sessionId: string, callType: 'audio' | 'video') => {
    if (socketRef.current && user) {
      socketRef.current.emit('call:invite', {
        sessionId,
        callerId: user.id,
        callerName: `${user.firstName} ${user.lastName}`,
        callType,
      });
      setActiveCall({ sessionId, callType });
    }
  }, [user]);

  const acceptCall = useCallback(() => {
    if (socketRef.current && incomingCall && user) {
      socketRef.current.emit('call:accept', {
        sessionId: incomingCall.sessionId,
        accepterId: user.id,
      });
      setActiveCall({ sessionId: incomingCall.sessionId, callType: incomingCall.callType });
      setIncomingCall(null);
    }
  }, [incomingCall, user]);

  const rejectCall = useCallback(() => {
    if (socketRef.current && incomingCall && user) {
      socketRef.current.emit('call:reject', {
        sessionId: incomingCall.sessionId,
        rejecterId: user.id,
      });
      setIncomingCall(null);
    }
  }, [incomingCall, user]);

  const endCall = useCallback(() => {
    if (socketRef.current && activeCall) {
      socketRef.current.emit('call:end', {
        sessionId: activeCall.sessionId,
      });
      setActiveCall(null);
    }
  }, [activeCall]);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      sendMessage,
      createSession,
      selectSession,
      markAsRead,
      isConnected,
      isTyping,
      setTyping,
      incomingCall,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      activeCall,
      startGuestSession,
      guestId,
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

const defaultChatContext: ChatContextType = {
  sessions: [],
  currentSession: null,
  sendMessage: () => {},
  createSession: () => '',
  selectSession: () => {},
  markAsRead: () => {},
  isConnected: false,
  isTyping: {},
  setTyping: () => {},
  incomingCall: null,
  initiateCall: () => {},
  acceptCall: () => {},
  startGuestSession: () => '',
  guestId: null,
  rejectCall: () => {},
  endCall: () => {},
  activeCall: null,
};

export function useChatSafe() {
  const context = useContext(ChatContext);
  return context ?? defaultChatContext;
}
