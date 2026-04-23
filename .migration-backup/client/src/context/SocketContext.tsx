import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      newSocket.emit('join', { userId: user.id, role: user.role || 'user' });
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id, user?.role]);

  const emit = useCallback((event: string, data: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
