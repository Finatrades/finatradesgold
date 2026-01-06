import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import { getWebRTCConfig, getMediaConstraints, isWebRTCSupported, checkMediaPermissions } from '@/lib/webrtcConfig';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/queryClient';

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
  guestName?: string;
  guestEmail?: string;
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

interface CallState {
  sessionId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'connecting' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
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
  initiateCall: (sessionId: string, callType: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  activeCall: CallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  startGuestSession: (name: string, email: string) => string;
  guestId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTypingState] = useState<{ [sessionId: string]: boolean }>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isGuestReady, setIsGuestReady] = useState(false);

  // Cleanup function for ending calls
  const cleanupCall = useCallback(() => {
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear pending ICE candidates
    pendingIceCandidatesRef.current = [];
    
    // Clear remote stream
    setRemoteStream(null);
    
    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset call states
    setActiveCall(null);
    setIncomingCall(null);
  }, [localStream]);

  // Create and configure peer connection
  const createPeerConnection = useCallback((sessionId: string) => {
    const config = getWebRTCConfig();
    const pc = new RTCPeerConnection(config);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          sessionId,
          candidate: event.candidate.toJSON(),
          senderId: user?.id || guestId,
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        // Start call duration timer
        callTimerRef.current = setInterval(() => {
          setActiveCall(prev => prev ? { ...prev, callDuration: prev.callDuration + 1 } : null);
        }, 1000);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast({
          title: "Call Disconnected",
          description: "The call connection was lost.",
          variant: "destructive",
        });
        cleanupCall();
      }
    };
    
    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
    };
    
    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
    };
    
    peerConnectionRef.current = pc;
    return pc;
  }, [user, guestId, cleanupCall, toast]);

  // Add local tracks to peer connection
  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  }, []);

  // Process pending ICE candidates
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;
    
    for (const candidate of pendingIceCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTC] Error adding buffered ICE candidate:', error);
      }
    }
    pendingIceCandidatesRef.current = [];
  }, []);

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
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
        loadSessionMessages(data.sessionId);
        
        // For guests, create a local session entry with the server's ID
        const storedGuestName = sessionStorage.getItem('finatrades_guest_name');
        const storedGuestEmail = sessionStorage.getItem('finatrades_guest_email');
        if (storedGuestName && storedGuestEmail) {
          setSessions(prev => {
            const exists = prev.some(s => s.id === data.sessionId);
            if (exists) return prev;
            return [{
              id: data.sessionId,
              userId: '',
              userName: storedGuestName,
              guestName: storedGuestName,
              guestEmail: storedGuestEmail,
              messages: [],
              status: 'active' as const,
              lastMessageAt: new Date(),
              unreadCount: 0,
            }, ...prev];
          });
        }
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
      console.log('[Call] Call accepted by:', data.accepterId);
      setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : null);
    });

    socket.on('call:rejected', (data: { sessionId: string; rejecterId: string }) => {
      toast({
        title: "Call Rejected",
        description: "The call was declined.",
      });
      cleanupCall();
    });

    socket.on('call:ended', (data: { sessionId: string }) => {
      toast({
        title: "Call Ended",
        description: "The call has ended.",
      });
      cleanupCall();
    });

    // WebRTC Signaling Events
    socket.on('webrtc:offer', async (data: { 
      sessionId: string; 
      offer: RTCSessionDescriptionInit;
      callerId: string;
      callType: 'audio' | 'video';
    }) => {
      console.log('[WebRTC] Received offer from:', data.callerId);
      
      // This is the callee receiving an offer - they need to create answer
      // The offer will be processed when user accepts the call
      setIncomingCall({
        sessionId: data.sessionId,
        callerId: data.callerId,
        callerName: 'Caller', // Will be updated
        callType: data.callType,
      });
      
      // Store offer for later processing
      (window as any).__pendingOffer = data.offer;
      (window as any).__pendingCallType = data.callType;
    });

    socket.on('webrtc:answer', async (data: { 
      sessionId: string; 
      answer: RTCSessionDescriptionInit;
      answererId: string;
    }) => {
      console.log('[WebRTC] Received answer from:', data.answererId);
      
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processPendingCandidates();
        } catch (error) {
          console.error('[WebRTC] Error setting remote description:', error);
        }
      }
    });

    socket.on('webrtc:ice-candidate', async (data: { 
      sessionId: string; 
      candidate: RTCIceCandidateInit;
      senderId: string;
    }) => {
      console.log('[WebRTC] Received ICE candidate from:', data.senderId);
      
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('[WebRTC] Error adding ICE candidate:', error);
        }
      } else {
        // Buffer candidate for later
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      cleanupCall();
    };
  }, [user, isGuestReady, guestId, cleanupCall, processPendingCandidates, toast]);

  // Load sessions on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllSessions();
    }
  }, [user]);

  const loadAllSessions = async () => {
    try {
      const response = await apiFetch('/api/admin/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        const formattedSessions: ChatSession[] = await Promise.all(
          data.sessions.map(async (session: any) => {
            const messagesResponse = await fetch(`/api/chat/messages/${session.id}`);
            const messagesData = messagesResponse.ok ? await messagesResponse.json() : { messages: [] };
            
            return {
              id: session.id,
              userId: session.userId || '',
              userName: session.userName || session.guestName || 'Guest',
              guestName: session.guestName,
              guestEmail: session.guestEmail || session.userEmail,
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
    
    // Store guest info - socket will use this when connecting
    sessionStorage.setItem('finatrades_guest_name', name);
    sessionStorage.setItem('finatrades_guest_email', email);
    
    // Set ready flag to trigger socket connection
    setIsGuestReady(true);
    
    // Session will be created by server and returned via 'joined' event
    return '';
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
  }, [currentSessionId, user, guestId]);

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

  // Initiate a call (caller side)
  const initiateCall = useCallback(async (sessionId: string, callType: 'audio' | 'video') => {
    if (!socketRef.current || !user) return;
    
    // Check WebRTC support
    if (!isWebRTCSupported()) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support video/audio calls.",
        variant: "destructive",
      });
      return;
    }
    
    // Check media permissions
    const { hasPermission, error } = await checkMediaPermissions(callType);
    if (!hasPermission) {
      toast({
        title: "Permission Required",
        description: error || "Please allow access to your camera and microphone.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get local media stream
      const constraints = getMediaConstraints(callType);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      // Create peer connection
      const pc = createPeerConnection(sessionId);
      
      // Add local tracks
      addLocalTracks(pc, stream);
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Set active call state
      setActiveCall({
        sessionId,
        callType,
        status: 'ringing',
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
      });
      
      // Send call invitation
      socketRef.current.emit('call:invite', {
        sessionId,
        callerId: user.id,
        callerName: `${user.firstName} ${user.lastName}`,
        callType,
      });
      
      // Send WebRTC offer
      socketRef.current.emit('webrtc:offer', {
        sessionId,
        offer: pc.localDescription?.toJSON(),
        callerId: user.id,
        callType,
      });
      
    } catch (error: any) {
      console.error('[WebRTC] Error initiating call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to start the call.",
        variant: "destructive",
      });
      cleanupCall();
    }
  }, [user, createPeerConnection, addLocalTracks, cleanupCall, toast]);

  // Accept an incoming call (callee side)
  const acceptCall = useCallback(async () => {
    if (!socketRef.current || !incomingCall) return;
    
    const userId = user?.id || guestId;
    if (!userId) return;
    
    // Check WebRTC support
    if (!isWebRTCSupported()) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support video/audio calls.",
        variant: "destructive",
      });
      return;
    }
    
    const callType = (window as any).__pendingCallType || incomingCall.callType;
    
    // Check media permissions
    const { hasPermission, error } = await checkMediaPermissions(callType);
    if (!hasPermission) {
      toast({
        title: "Permission Required",
        description: error || "Please allow access to your camera and microphone.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get local media stream
      const constraints = getMediaConstraints(callType);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      // Create peer connection
      const pc = createPeerConnection(incomingCall.sessionId);
      
      // Add local tracks
      addLocalTracks(pc, stream);
      
      // Process the pending offer
      const pendingOffer = (window as any).__pendingOffer;
      if (pendingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        await processPendingCandidates();
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socketRef.current.emit('webrtc:answer', {
          sessionId: incomingCall.sessionId,
          answer: pc.localDescription?.toJSON(),
          answererId: userId,
        });
        
        // Clear pending offer
        delete (window as any).__pendingOffer;
        delete (window as any).__pendingCallType;
      }
      
      // Set active call state
      setActiveCall({
        sessionId: incomingCall.sessionId,
        callType,
        status: 'connecting',
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
      });
      
      // Send call accepted signal
      socketRef.current.emit('call:accept', {
        sessionId: incomingCall.sessionId,
        accepterId: userId,
      });
      
      setIncomingCall(null);
      
    } catch (error: any) {
      console.error('[WebRTC] Error accepting call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to accept the call.",
        variant: "destructive",
      });
      cleanupCall();
    }
  }, [incomingCall, user, guestId, createPeerConnection, addLocalTracks, processPendingCandidates, cleanupCall, toast]);

  const rejectCall = useCallback(() => {
    if (socketRef.current && incomingCall) {
      const userId = user?.id || guestId;
      socketRef.current.emit('call:reject', {
        sessionId: incomingCall.sessionId,
        rejecterId: userId,
      });
      setIncomingCall(null);
      
      // Clear any pending offer
      delete (window as any).__pendingOffer;
      delete (window as any).__pendingCallType;
    }
  }, [incomingCall, user, guestId]);

  const endCall = useCallback(() => {
    if (socketRef.current && activeCall) {
      socketRef.current.emit('call:end', {
        sessionId: activeCall.sessionId,
      });
    }
    cleanupCall();
  }, [activeCall, cleanupCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setActiveCall(prev => prev ? { ...prev, isMuted: !audioTrack.enabled } : null);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setActiveCall(prev => prev ? { ...prev, isVideoOff: !videoTrack.enabled } : null);
      }
    }
  }, [localStream]);

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
      localStream,
      remoteStream,
      toggleMute,
      toggleVideo,
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
  initiateCall: async () => {},
  acceptCall: async () => {},
  startGuestSession: () => '',
  guestId: null,
  rejectCall: () => {},
  endCall: () => {},
  activeCall: null,
  localStream: null,
  remoteStream: null,
  toggleMute: () => {},
  toggleVideo: () => {},
};

export function useChatSafe() {
  const context = useContext(ChatContext);
  return context ?? defaultChatContext;
}
