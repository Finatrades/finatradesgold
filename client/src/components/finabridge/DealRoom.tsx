import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { io, Socket } from 'socket.io-client';
import { 
  Send, Paperclip, ArrowLeft, MessageCircle, Users, 
  FileText, Image, Download, Loader2, Check, CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface DealRoomMessage {
  id: string;
  dealRoomId: string;
  senderUserId: string;
  senderRole: 'importer' | 'exporter' | 'admin';
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    finatradesId: string | null;
    email: string;
  } | null;
}

interface DealRoomData {
  id: string;
  tradeRequestId: string;
  acceptedProposalId: string;
  importerUserId: string;
  exporterUserId: string;
  assignedAdminId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tradeRequest?: {
    tradeRefId: string;
    goodsName: string;
    tradeValueUsd: string;
    status: string;
  };
  importer?: { id: string; finatradesId: string | null; email: string } | null;
  exporter?: { id: string; finatradesId: string | null; email: string } | null;
  assignedAdmin?: { id: string; finatradesId: string | null; email: string } | null;
}

interface DealRoomProps {
  dealRoomId: string;
  userRole: 'importer' | 'exporter' | 'admin';
  onClose?: () => void;
}

export default function DealRoom({ dealRoomId, userRole, onClose }: DealRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<DealRoomData | null>(null);
  const [messages, setMessages] = useState<DealRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
      }
    } catch (error) {
      console.error('Failed to fetch deal room:', error);
    }
  }, [dealRoomId]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/messages?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [dealRoomId, scrollToBottom, user]);

  useEffect(() => {
    fetchRoom();
    fetchMessages();
  }, [fetchRoom, fetchMessages]);

  useEffect(() => {
    if (!user || !dealRoomId) return;

    const socket = io({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Deal room socket connected');
      socket.emit('dealroom:join', { dealRoomId, userId: user.id });
    });

    socket.on('dealroom:message', (message: DealRoomMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socket.on('dealroom:user-joined', ({ userId }) => {
      setOnlineUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
    });

    socket.on('dealroom:user-left', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socket.on('dealroom:typing', ({ userId, isTyping }) => {
      if (isTyping) {
        setTypingUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    });

    socket.on('dealroom:read', ({ userId }) => {
      if (userId !== user.id) {
        setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })));
      }
    });

    socket.on('dealroom:error', ({ message }) => {
      toast({ title: 'Error', description: message, variant: 'destructive' });
    });

    return () => {
      socket.emit('dealroom:leave', { dealRoomId, userId: user.id });
      socket.disconnect();
    };
  }, [user, dealRoomId, scrollToBottom, toast]);

  useEffect(() => {
    if (!user || !socketRef.current) return;
    
    socketRef.current.emit('dealroom:read', { dealRoomId, userId: user.id });
  }, [messages, user, dealRoomId]);

  const handleTyping = useCallback(() => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('dealroom:typing', { dealRoomId, userId: user.id, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('dealroom:typing', { dealRoomId, userId: user.id, isTyping: false });
    }, 2000);
  }, [dealRoomId, user]);

  const sendMessage = async (content?: string, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) => {
    if (!user || (!content?.trim() && !attachmentUrl)) return;

    setSending(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('dealroom:message', {
          dealRoomId,
          senderUserId: user.id,
          senderRole: userRole,
          content: content?.trim() || null,
          attachmentUrl,
          attachmentName,
          attachmentType,
        });
        setNewMessage('');
      } else {
        const response = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/messages`, {
          senderUserId: user.id,
          senderRole: userRole,
          content: content?.trim() || null,
          attachmentUrl,
          attachmentName,
          attachmentType,
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          scrollToBottom();
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        await sendMessage(undefined, data.url, file.name, file.type);
      } else {
        toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    sendMessage(newMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'importer':
        return 'bg-blue-500';
      case 'exporter':
        return 'bg-green-500';
      case 'admin':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'importer':
        return 'secondary';
      case 'exporter':
        return 'default';
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getAttachmentIcon = (type: string | null) => {
    if (!type) return <FileText className="w-4 h-4" />;
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col" data-testid="deal-room-container">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-dealroom">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-500" />
                Deal Room
              </CardTitle>
              {room?.tradeRequest && (
                <p className="text-sm text-muted-foreground mt-1">
                  {room.tradeRequest.tradeRefId} - {room.tradeRequest.goodsName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{onlineUsers.length + 1} online</span>
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3 flex-wrap">
          {room?.importer && (
            <Badge variant={getRoleBadgeVariant('importer')} className="text-xs">
              Importer: {room.importer.finatradesId || room.importer.email}
            </Badge>
          )}
          {room?.exporter && (
            <Badge variant={getRoleBadgeVariant('exporter')} className="text-xs">
              Exporter: {room.exporter.finatradesId || room.exporter.email}
            </Badge>
          )}
          {room?.assignedAdmin && (
            <Badge variant={getRoleBadgeVariant('admin')} className="text-xs">
              Admin: {room.assignedAdmin.finatradesId || 'Assigned'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.senderUserId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`text-white text-xs ${getRoleColor(msg.senderRole)}`}>
                          {msg.senderRole.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {msg.sender?.finatradesId || msg.senderRole}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {msg.senderRole}
                          </Badge>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isOwnMessage
                              ? 'bg-orange-500 text-white'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                          {msg.attachmentUrl && (
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 mt-2 p-2 rounded border ${
                                isOwnMessage ? 'border-white/30 hover:bg-white/10' : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              {getAttachmentIcon(msg.attachmentType)}
                              <span className="text-xs truncate max-w-[150px]">
                                {msg.attachmentName || 'Attachment'}
                              </span>
                              <Download className="w-3 h-3 ml-auto" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                          {isOwnMessage && (
                            msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                </div>
                <span>Someone is typing</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-attach-file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              data-testid="button-send-message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
