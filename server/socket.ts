import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { storage } from "./storage";

interface ConnectedUser {
  socketId: string;
  odId: string;
  role: 'user' | 'admin';
}

const connectedUsers = new Map<string, ConnectedUser>();

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins with their userId
    socket.on("join", async (data: { userId: string; role: 'user' | 'admin' }) => {
      const { userId, role } = data;
      
      // Validate userId before proceeding
      if (!userId) {
        console.error('Join event received without userId');
        socket.emit('error', { message: 'userId is required' });
        return;
      }
      
      connectedUsers.set(userId, {
        socketId: socket.id,
        odId: userId,
        role
      });

      socket.join(userId);
      
      // If admin, join the admin room
      if (role === 'admin') {
        socket.join('admin-room');
      }

      // Get or create chat session for user (only for non-admin users)
      let session = await storage.getChatSession(userId);
      if (!session && role !== 'admin') {
        session = await storage.createChatSession({
          userId: userId,
          status: 'active',
          lastMessageAt: new Date(),
        });
      }

      // Join the session room if session exists
      if (session) {
        socket.join(`session-${session.id}`);
      }

      // Notify admins of user connection
      if (role === 'user' && session) {
        io.to('admin-room').emit('user:online', { userId, sessionId: session.id });
      }

      socket.emit("joined", { sessionId: session?.id });
    });

    // Handle admin joining a specific session
    socket.on("join-session", (data: { sessionId: string }) => {
      if (data.sessionId) {
        socket.join(`session-${data.sessionId}`);
        console.log(`Socket ${socket.id} joined session room: session-${data.sessionId}`);
      }
    });

    // Handle new message
    socket.on("chat:message", async (data: { 
      sessionId: string; 
      content: string; 
      sender: 'user' | 'admin' | 'agent';
      userId: string;
    }) => {
      try {
        const { sessionId, content, sender, userId } = data;

        // Save message to database
        const message = await storage.createChatMessage({
          sessionId,
          content,
          sender,
          isRead: false,
        });

        // Update session last message time
        await storage.updateChatSession(sessionId, {
          lastMessageAt: new Date(),
        });

        // Broadcast message to all users in the session room
        io.to(`session-${sessionId}`).emit('chat:message', {
          ...message,
          sessionId,
        });

        // Notify admins of new message if from user
        if (sender === 'user') {
          io.to('admin-room').emit('chat:new-message', {
            sessionId,
            message,
            userId,
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on("chat:typing", (data: { sessionId: string; userId: string; isTyping: boolean }) => {
      socket.to(`session-${data.sessionId}`).emit('chat:typing', data);
    });

    // Handle read receipts
    socket.on("chat:read", async (data: { sessionId: string }) => {
      try {
        await storage.markMessagesAsRead(data.sessionId);
        io.to(`session-${data.sessionId}`).emit('chat:read', { sessionId: data.sessionId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle video call invitation
    socket.on("call:invite", (data: { 
      sessionId: string; 
      callerId: string; 
      callerName: string;
      callType: 'audio' | 'video';
    }) => {
      // Send call invitation to the session room (excluding sender)
      socket.to(`session-${data.sessionId}`).emit('call:incoming', {
        sessionId: data.sessionId,
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
      });
    });

    // Handle call acceptance
    socket.on("call:accept", (data: { sessionId: string; accepterId: string }) => {
      io.to(`session-${data.sessionId}`).emit('call:accepted', data);
    });

    // Handle call rejection
    socket.on("call:reject", (data: { sessionId: string; rejecterId: string }) => {
      io.to(`session-${data.sessionId}`).emit('call:rejected', data);
    });

    // Handle call end
    socket.on("call:end", (data: { sessionId: string }) => {
      io.to(`session-${data.sessionId}`).emit('call:ended', data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find and remove the user
      const entries = Array.from(connectedUsers.entries());
      for (const [odId, user] of entries) {
        if (user.socketId === socket.id) {
          connectedUsers.delete(odId);
          
          // Notify admins of user disconnection
          if (user.role === 'user') {
            io.to('admin-room').emit('user:offline', { userId: odId });
          }
          break;
        }
      }
    });
  });

  return io;
}
