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
  FileText, Image, Download, Loader2, Check, CheckCheck,
  Shield, Lock, AlertTriangle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

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
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  closureNotes: string | null;
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

interface AgreementAcceptance {
  id: string;
  dealRoomId: string;
  userId: string;
  role: 'importer' | 'exporter' | 'admin';
  agreementVersion: string;
  acceptedAt: string;
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
  
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [allAcceptances, setAllAcceptances] = useState<AgreementAcceptance[]>([]);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closingRoom, setClosingRoom] = useState(false);

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

  const fetchAgreementStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiRequest('GET', `/api/deal-rooms/${dealRoomId}/agreement`);
      if (response.ok) {
        const data = await response.json();
        setHasAcceptedTerms(data.hasAccepted);
        setAllAcceptances(data.allAcceptances || []);
        if (!data.hasAccepted) {
          setShowTermsDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch agreement status:', error);
    }
  }, [dealRoomId, user]);

  const acceptTerms = async () => {
    if (!termsAgreed) return;
    setAcceptingTerms(true);
    try {
      const response = await apiRequest('POST', `/api/deal-rooms/${dealRoomId}/agreement/accept`, {});
      if (response.ok) {
        setHasAcceptedTerms(true);
        setShowTermsDialog(false);
        toast({ title: 'Terms Accepted', description: 'You can now access the deal room' });
        await fetchAgreementStatus();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to accept terms', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to accept terms', variant: 'destructive' });
    } finally {
      setAcceptingTerms(false);
    }
  };

  const closeDealRoom = async () => {
    setClosingRoom(true);
    try {
      const response = await apiRequest('POST', `/api/admin/deal-rooms/${dealRoomId}/close`, { closureNotes });
      if (response.ok) {
        toast({ title: 'Deal Room Closed', description: 'The deal room has been closed successfully' });
        setShowCloseDialog(false);
        await fetchRoom();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to close deal room', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to close deal room', variant: 'destructive' });
    } finally {
      setClosingRoom(false);
    }
  };

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
    fetchAgreementStatus();
  }, [fetchRoom, fetchMessages, fetchAgreementStatus]);

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

  const canCloseRoom = userRole === 'admin' && room && !room.isClosed && 
    room.tradeRequest && ['Settled', 'Completed', 'Cancelled'].includes(room.tradeRequest.status);

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const termsContent = `
FINABRIDGE TRADE FINANCE - TERMS AND CONDITIONS

By accepting these terms, you agree to the following:

1. CONFIDENTIALITY
All information shared within this Deal Room is strictly confidential. You agree not to disclose any trade details, communications, or documentation to third parties without prior written consent from all parties involved.

2. COMPLIANCE
You confirm that all goods, transactions, and activities conducted through FinaBridge comply with applicable local and international trade regulations, including but not limited to anti-money laundering (AML) and know-your-customer (KYC) requirements.

3. DISPUTE RESOLUTION
Any disputes arising from transactions facilitated through FinaBridge shall be resolved through binding arbitration in accordance with the rules of the Dubai International Arbitration Centre (DIAC).

4. GOLD-BACKED SETTLEMENT
You acknowledge that settlements are conducted using gold-backed digital assets. The value of settlements is determined by prevailing market rates at the time of settlement confirmation.

5. PLATFORM FEES
You agree to pay all applicable platform fees as disclosed prior to transaction confirmation. Fees are non-refundable once a transaction is initiated.

6. LIABILITY
FinaBridge acts as a facilitator and does not guarantee the performance of any counterparty. Users assume full responsibility for conducting due diligence on trading partners.

7. DOCUMENT AUTHENTICITY
You warrant that all documents uploaded to this Deal Room are authentic and have not been altered or falsified in any way.

8. DATA PROTECTION
Your personal and business information will be processed in accordance with our Privacy Policy. By using FinaBridge, you consent to the collection and use of your data for transaction processing and compliance purposes.

9. TERMINATION
FinaBridge reserves the right to terminate access to this Deal Room if any party is found to be in violation of these terms or applicable laws.

10. GOVERNING LAW
These terms are governed by the laws of the United Arab Emirates.

Version 1.0 - Effective Date: January 2025
  `.trim();

  return (
    <>
      <AlertDialog open={showTermsDialog && !hasAcceptedTerms} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              FinaBridge Terms & Conditions
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please read and accept the following terms before accessing the Deal Room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <ScrollArea className="h-[300px] border rounded-md p-4 my-4">
            <pre className="whitespace-pre-wrap text-sm font-sans">{termsContent}</pre>
          </ScrollArea>
          
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="terms-agree"
              checked={termsAgreed}
              onCheckedChange={(checked) => setTermsAgreed(checked === true)}
              data-testid="checkbox-agree-terms"
            />
            <label htmlFor="terms-agree" className="text-sm cursor-pointer">
              I have read, understood, and agree to the FinaBridge Terms & Conditions. I acknowledge that my acceptance is legally binding.
            </label>
          </div>
          
          <AlertDialogFooter>
            {onClose && (
              <AlertDialogCancel onClick={onClose} data-testid="button-decline-terms">
                Decline & Exit
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={acceptTerms}
              disabled={!termsAgreed || acceptingTerms}
              data-testid="button-accept-terms"
            >
              {acceptingTerms ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept Terms
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Close Deal Room
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once closed, this Deal Room will become read-only. No new messages can be sent. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Closure Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about why this deal room is being closed..."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              data-testid="input-closure-notes"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={closeDealRoom}
              disabled={closingRoom}
              data-testid="button-confirm-close"
            >
              {closingRoom ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Close Deal Room
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="h-full flex flex-col" data-testid="deal-room-container">
        {room?.isClosed && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center gap-2 text-destructive">
            <Lock className="w-4 h-4" />
            <span className="font-medium">
              {room.tradeRequest?.status === 'Completed' 
                ? 'Trade Completed - Deal Room Closed'
                : room.tradeRequest?.status === 'Cancelled'
                ? 'Trade Cancelled - Deal Room Closed'
                : room.tradeRequest?.status === 'Settled'
                ? 'Trade Settled - Deal Room Closed'
                : 'This Deal Room is closed'}
            </span>
            {room.closedAt && (
              <span className="text-sm opacity-75">
                - Closed on {format(new Date(room.closedAt), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>
        )}
        
        {allAcceptances.length > 0 && (
          <div className="bg-success-muted border-b px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-success" />
              <span className="font-medium text-success">Terms Accepted:</span>
              {allAcceptances.map((a) => (
                <Badge key={a.id} variant="outline" className="text-xs">
                  {a.role.charAt(0).toUpperCase() + a.role.slice(1)} - {format(new Date(a.acceptedAt), 'MMM d, yyyy')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
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
                  {room?.isClosed && <Badge variant="destructive">Closed</Badge>}
                </CardTitle>
                {room?.tradeRequest && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {room.tradeRequest.tradeRefId} - {room.tradeRequest.goodsName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canCloseRoom && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseDialog(true)}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  data-testid="button-open-close-dialog"
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Close Room
                </Button>
              )}
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

        {room?.isClosed ? (
          <div className="p-4 bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>
                {room.tradeRequest?.status === 'Completed' 
                  ? 'This trade has been completed successfully. The deal room is now closed.'
                  : room.tradeRequest?.status === 'Cancelled'
                  ? 'This trade was cancelled. The deal room is now closed.'
                  : room.tradeRequest?.status === 'Settled'
                  ? 'This trade has been settled. The deal room is now closed.'
                  : 'This deal room is closed. No new messages can be sent.'}
              </span>
            </div>
            {room.closureNotes && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{room.closureNotes}"
              </p>
            )}
          </div>
        ) : !hasAcceptedTerms ? (
          <div className="p-4 bg-warning-muted text-center">
            <div className="flex items-center justify-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span>Please accept the Terms & Conditions to participate in this deal room.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowTermsDialog(true)}
              data-testid="button-view-terms"
            >
              View Terms & Conditions
            </Button>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
    </>
  );
}
