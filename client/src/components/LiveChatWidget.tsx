import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  ChevronLeft, 
  Plus, 
  Clock, 
  CheckCircle,
  Loader2,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sessionId: string;
  agentId?: string | null;
  sender: "user" | "admin" | "agent";
  content: string;
  intent?: string | null;
  confidence?: string | null;
  metadata?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ChatSession {
  id: string;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  currentAgentId?: string | null;
  status: "active" | "closed";
  context?: string | null;
  topic?: string | null;
  lastMessageAt: string;
  createdAt: string;
  unreadCount?: number;
}

type ViewMode = "sessions" | "chat" | "new";

export default function LiveChatWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ["/api/chat/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/chat/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: isOpen ? 10000 : 30000,
  });

  const { data: activeSessionData, refetch: refetchActiveSession } = useQuery({
    queryKey: ["/api/chat/sessions", activeSessionId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/sessions/${activeSessionId}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!activeSessionId && viewMode === "chat",
    refetchInterval: isOpen && viewMode === "chat" ? 3000 : false,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setActiveSessionId(data.session.id);
      setViewMode("chat");
      setNewTopic("");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      refetchActiveSession();
      refetchSessions();
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/chat/sessions/${sessionId}/close`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to close session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setActiveSessionId(null);
      setViewMode("sessions");
    },
  });

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, activeSessionData?.messages]);

  useEffect(() => {
    const messages = activeSessionData?.messages || [];
    const adminMessages = messages.filter((m: ChatMessage) => m.sender === "admin" || m.sender === "agent");
    if (!isOpen && adminMessages.length > lastMessageCountRef.current) {
      setHasNewMessage(true);
    }
    lastMessageCountRef.current = adminMessages.length;
  }, [activeSessionData?.messages, isOpen]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setViewMode("chat");
    setHasNewMessage(false);
  };

  const handleBackToSessions = () => {
    setActiveSessionId(null);
    setViewMode("sessions");
  };

  const handleStartNewChat = () => {
    setViewMode("new");
  };

  const handleCreateSession = () => {
    if (newTopic.trim()) {
      createSessionMutation.mutate(newTopic.trim());
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && activeSessionId) {
      sendMessageMutation.mutate({ sessionId: activeSessionId, content: message.trim() });
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (viewMode === "new") {
        handleCreateSession();
      } else {
        handleSendMessage();
      }
    }
  };

  const sessions: ChatSession[] = sessionsData?.sessions || [];
  const messages: ChatMessage[] = activeSessionData?.messages || [];
  const activeSession = activeSessionData?.session;

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={handleOpenChat}
            className="fixed bottom-28 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
            data-testid="button-live-chat-open"
          >
            <MessageCircle className="w-6 h-6" />
            {hasNewMessage && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <span className="text-xs font-bold text-white">!</span>
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-28 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-background border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ height: "500px" }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 flex items-center gap-3">
              {viewMode !== "sessions" && (
                <button
                  onClick={handleBackToSessions}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  data-testid="button-live-chat-back"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="text-white font-semibold">
                  {viewMode === "sessions" && "Live Support"}
                  {viewMode === "new" && "New Conversation"}
                  {viewMode === "chat" && (activeSession?.topic || "Chat")}
                </h3>
                <p className="text-white/80 text-xs">
                  {viewMode === "sessions" && "Your support conversations"}
                  {viewMode === "new" && "Start a new chat"}
                  {viewMode === "chat" && (activeSession?.status === "closed" ? "Closed" : "Active")}
                </p>
              </div>
              <button
                onClick={handleCloseChat}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                data-testid="button-live-chat-close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {viewMode === "sessions" && (
                  <motion.div
                    key="sessions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col"
                  >
                    <div className="p-3">
                      <Button
                        onClick={handleStartNewChat}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                        data-testid="button-new-chat"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Start New Chat
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 px-3 pb-3">
                      {sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No conversations yet</p>
                          <p className="text-xs mt-1">Start a new chat to get help</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sessions.map((session) => (
                            <div
                              key={session.id}
                              onClick={() => handleSelectSession(session.id)}
                              className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors border border-transparent hover:border-purple-200"
                              data-testid={`session-item-${session.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {session.topic || "General Inquiry"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(session.lastMessageAt), "MMM d, h:mm a")}
                                    </span>
                                  </div>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  session.status === "active" 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {session.status === "active" ? "Active" : "Closed"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </motion.div>
                )}

                {viewMode === "new" && (
                  <motion.div
                    key="new"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col p-4"
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-100 to-purple-200 flex items-center justify-center">
                          <MessageCircle className="w-8 h-8 text-purple-600" />
                        </div>
                        <h4 className="font-semibold text-foreground">How can we help?</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Describe your question or issue
                        </p>
                      </div>
                      <div className="space-y-4">
                        <Input
                          placeholder="e.g., Help with gold purchase"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyPress={handleKeyPress}
                          data-testid="input-new-topic"
                        />
                        <Button
                          onClick={handleCreateSession}
                          disabled={!newTopic.trim() || createSessionMutation.isPending}
                          className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                          data-testid="button-create-session"
                        >
                          {createSessionMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <MessageCircle className="w-4 h-4 mr-2" />
                          )}
                          Start Conversation
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {viewMode === "chat" && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col"
                  >
                    <ScrollArea className="flex-1 p-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1">Send a message to start the conversation</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                  msg.sender === "user"
                                    ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white"
                                    : "bg-muted text-foreground"
                                }`}
                                data-testid={`message-${msg.id}`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${
                                  msg.sender === "user" ? "text-white/70" : "text-muted-foreground"
                                }`}>
                                  {format(new Date(msg.createdAt), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {activeSession?.status !== "closed" ? (
                      <div className="p-3 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type your message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={sendMessageMutation.isPending}
                            className="flex-1"
                            data-testid="input-message"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!message.trim() || sendMessageMutation.isPending}
                            size="icon"
                            className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                            data-testid="button-send-message"
                          >
                            {sendMessageMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => closeSessionMutation.mutate(activeSessionId!)}
                            disabled={closeSessionMutation.isPending}
                            className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                            data-testid="button-close-session"
                          >
                            {closeSessionMutation.isPending ? "Closing..." : "Close conversation"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border-t border-border bg-muted/50">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">This conversation is closed</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
