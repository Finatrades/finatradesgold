import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { storage } from "./storage";

interface ConnectedUser {
  socketId: string;
  visitorId: string;
  role: 'user' | 'admin' | 'guest';
}

const connectedUsers = new Map<string, ConnectedUser>();

// Export io instance for use in routes
let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

// Emit ledger sync event to a specific user
export function emitLedgerEvent(userId: string, event: {
  type: 'balance_update' | 'transaction' | 'certificate' | 'notification' | 'deposit_rejected' | 'withdrawal_rejected' | 'crypto_rejected' | 'physical_deposit_update' | 'negotiation_message';
  module: 'finapay' | 'finavault' | 'bnsl' | 'finabridge' | 'system';
  action: string;
  data?: any;
}) {
  if (ioInstance) {
    ioInstance.to(userId).emit('ledger:sync', {
      ...event,
      timestamp: new Date().toISOString(),
      syncVersion: Date.now(),
    });
    console.log(`[Socket] Emitted ledger:sync to user ${userId}: ${event.type}/${event.action}`);
  }
}

// Emit admin-specific notifications (to all admins in admin-room)
export function emitAdminNotification(event: {
  type: 'negotiation_update' | 'physical_deposit_update' | 'user_action';
  action: string;
  data?: any;
}) {
  if (ioInstance) {
    ioInstance.to('admin-room').emit('ledger:sync', {
      type: event.type,
      module: 'finavault',
      action: event.action,
      data: event.data,
      timestamp: new Date().toISOString(),
      syncVersion: Date.now(),
    });
    console.log(`[Socket] Emitted admin notification: ${event.type}/${event.action}`);
  }
}

// Emit to multiple users (e.g., sender and recipient in transfers)
export function emitLedgerEventToUsers(userIds: string[], event: {
  type: 'balance_update' | 'transaction' | 'certificate' | 'notification';
  module: 'finapay' | 'finavault' | 'bnsl' | 'finabridge' | 'system';
  action: string;
  data?: any;
}) {
  userIds.forEach(userId => emitLedgerEvent(userId, event));
}

// Emit a new in-app notification in real-time to a specific user
export function emitNotification(userId: string, notification: {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}) {
  if (ioInstance) {
    ioInstance.to(userId).emit('notification:new', notification);
    console.log(`[Socket] Emitted notification:new to user ${userId}: ${notification.title}`);
  }
}

export function setupSocketIO(httpServer: HttpServer) {
  // SECURITY: Strict CORS allowlist — prevents cross-origin socket hijacking
  const allowedOrigins = (() => {
    const list = new Set<string>();
    if (process.env.APP_URL) list.add(process.env.APP_URL.replace(/\/$/, ''));
    if (process.env.CLIENT_URL) list.add(process.env.CLIENT_URL.replace(/\/$/, ''));
    if (process.env.WINGOLD_ALLOWED_ORIGINS) {
      process.env.WINGOLD_ALLOWED_ORIGINS.split(',').forEach((o) => list.add(o.trim().replace(/\/$/, '')));
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(',').forEach((d) => list.add(`https://${d.trim()}`));
    }
    list.add('https://finatrades.com');
    list.add('https://www.finatrades.com');
    list.add('https://app.finatrades.com');
    return Array.from(list);
  })();

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Allow same-origin/no-origin requests (mobile apps, curl, server-to-server)
        if (!origin) return cb(null, true);
        // In dev, allow localhost and Replit dev URLs
        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|.*\.replit\.dev|.*\.repl\.co)/.test(origin)) {
          return cb(null, true);
        }
        if (allowedOrigins.includes(origin)) return cb(null, true);
        console.warn(`[Socket] Blocked CORS origin: ${origin}`);
        return cb(new Error('Not allowed by CORS'));
      },
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  // Store io instance for external access
  ioInstance = io;

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins with their userId
    socket.on("join", async (data: { userId: string; role: 'user' | 'admin' | 'guest'; guestName?: string; guestEmail?: string }) => {
      const { userId, role, guestName, guestEmail } = data;
      
      // Validate userId before proceeding
      if (!userId) {
        console.error('Join event received without userId');
        socket.emit('error', { message: 'userId is required' });
        return;
      }
      
      const isGuest = role === 'guest' || userId.startsWith('guest-');
      
      connectedUsers.set(userId, {
        socketId: socket.id,
        visitorId: userId,
        role: isGuest ? 'guest' : role
      });

      socket.join(userId);
      
      // If admin, join the admin room
      if (role === 'admin') {
        socket.join('admin-room');
      }

      // Get or create chat session for user (only for non-admin users)
      let session = null;
      if (role !== 'admin') {
        if (isGuest) {
          // For guests, look up by guest name/email or create new
          session = await storage.getChatSessionByGuest(guestName, guestEmail);
          if (!session && guestName && guestEmail) {
            session = await storage.createChatSession({
              guestName: guestName,
              guestEmail: guestEmail,
              status: 'active',
              lastMessageAt: new Date(),
            });
          }
        } else {
          // For registered users
          session = await storage.getChatSession(userId);
          if (!session) {
            try {
              session = await storage.createChatSession({
                userId: userId,
                status: 'active',
                lastMessageAt: new Date(),
              });
            } catch (err: any) {
              // User may not exist (e.g. DB was wiped but browser session cookie is stale)
              if (err?.code === '23503') {
                console.warn(`[Socket] Stale session for unknown userId=${userId} — skipping chat session creation`);
                socket.emit("joined", { sessionId: null, error: "session_expired" });
                return;
              }
              throw err;
            }
          }
        }
      }

      // Join the session room if session exists
      if (session) {
        socket.join(`session-${session.id}`);
      }

      // Notify admins of user connection
      if ((role === 'user' || isGuest) && session) {
        io.to('admin-room').emit('user:online', { userId, sessionId: session.id, guestName });
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

    // ============================================================================
    // WEBRTC SIGNALING
    // ============================================================================

    // Handle WebRTC offer (caller sends to callee)
    socket.on("webrtc:offer", (data: { 
      sessionId: string; 
      offer: any;
      callerId: string;
      callType: 'audio' | 'video';
    }) => {
      console.log(`[WebRTC] Offer from ${data.callerId} in session ${data.sessionId}`);
      socket.to(`session-${data.sessionId}`).emit('webrtc:offer', {
        sessionId: data.sessionId,
        offer: data.offer,
        callerId: data.callerId,
        callType: data.callType,
      });
    });

    // Handle WebRTC answer (callee responds to caller)
    socket.on("webrtc:answer", (data: { 
      sessionId: string; 
      answer: any;
      answererId: string;
    }) => {
      console.log(`[WebRTC] Answer from ${data.answererId} in session ${data.sessionId}`);
      socket.to(`session-${data.sessionId}`).emit('webrtc:answer', {
        sessionId: data.sessionId,
        answer: data.answer,
        answererId: data.answererId,
      });
    });

    // Handle ICE candidate exchange
    socket.on("webrtc:ice-candidate", (data: { 
      sessionId: string; 
      candidate: any;
      senderId: string;
    }) => {
      socket.to(`session-${data.sessionId}`).emit('webrtc:ice-candidate', {
        sessionId: data.sessionId,
        candidate: data.candidate,
        senderId: data.senderId,
      });
    });

    // Handle call renegotiation (for adding/removing tracks)
    socket.on("webrtc:renegotiate", (data: { 
      sessionId: string; 
      offer: any;
      senderId: string;
    }) => {
      console.log(`[WebRTC] Renegotiation from ${data.senderId} in session ${data.sessionId}`);
      socket.to(`session-${data.sessionId}`).emit('webrtc:renegotiate', {
        sessionId: data.sessionId,
        offer: data.offer,
        senderId: data.senderId,
      });
    });

    // ============================================================================
    // DEAL ROOM (Trade Case Conversations)
    // ============================================================================

    // Join a deal room
    socket.on("dealroom:join", (data: { dealRoomId: string; userId: string }) => {
      if (data.dealRoomId) {
        socket.join(`dealroom-${data.dealRoomId}`);
        console.log(`Socket ${socket.id} joined deal room: dealroom-${data.dealRoomId}`);
        
        // Notify others that user is online in the room
        socket.to(`dealroom-${data.dealRoomId}`).emit('dealroom:user-joined', {
          dealRoomId: data.dealRoomId,
          userId: data.userId,
        });
      }
    });

    // Leave a deal room
    socket.on("dealroom:leave", (data: { dealRoomId: string; userId: string }) => {
      if (data.dealRoomId) {
        socket.leave(`dealroom-${data.dealRoomId}`);
        console.log(`Socket ${socket.id} left deal room: dealroom-${data.dealRoomId}`);
        
        socket.to(`dealroom-${data.dealRoomId}`).emit('dealroom:user-left', {
          dealRoomId: data.dealRoomId,
          userId: data.userId,
        });
      }
    });

    // Handle deal room message
    socket.on("dealroom:message", async (data: {
      dealRoomId: string;
      senderUserId: string;
      senderRole: 'importer' | 'exporter' | 'admin';
      content?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
    }) => {
      try {
        const { dealRoomId, senderUserId, senderRole, content, attachmentUrl, attachmentName, attachmentType } = data;

        // Verify the room exists and user is a participant or admin
        const room = await storage.getDealRoom(dealRoomId);
        if (!room) {
          socket.emit('dealroom:error', { message: 'Deal room not found' });
          return;
        }

        // Check if user is an admin - admins can always send messages
        const user = await storage.getUser(senderUserId);
        const isAdmin = user?.role === 'admin';
        const isParticipant = [room.importerUserId, room.exporterUserId, room.assignedAdminId].includes(senderUserId);
        if (!isParticipant && !isAdmin) {
          socket.emit('dealroom:error', { message: 'Not a participant in this deal room' });
          return;
        }

        // Save message to database
        const message = await storage.createDealRoomMessage({
          dealRoomId,
          senderUserId,
          senderRole,
          content: content || null,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          attachmentType: attachmentType || null,
          isRead: false,
        });

        // Get sender info
        const sender = await storage.getUser(senderUserId);

        // Broadcast message to all users in the deal room
        io.to(`dealroom-${dealRoomId}`).emit('dealroom:message', {
          ...message,
          sender: sender ? { id: sender.id, finatradesId: sender.finatradesId, email: sender.email } : null,
        });

      } catch (error) {
        console.error('Error sending deal room message:', error);
        socket.emit('dealroom:error', { message: 'Failed to send message' });
      }
    });

    // Handle deal room typing indicator
    socket.on("dealroom:typing", (data: { dealRoomId: string; userId: string; isTyping: boolean }) => {
      socket.to(`dealroom-${data.dealRoomId}`).emit('dealroom:typing', data);
    });

    // Handle deal room read receipts
    socket.on("dealroom:read", async (data: { dealRoomId: string; userId: string }) => {
      try {
        await storage.markDealRoomMessagesAsRead(data.dealRoomId, data.userId);
        io.to(`dealroom-${data.dealRoomId}`).emit('dealroom:read', { 
          dealRoomId: data.dealRoomId, 
          userId: data.userId 
        });
      } catch (error) {
        console.error('Error marking deal room messages as read:', error);
      }
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
