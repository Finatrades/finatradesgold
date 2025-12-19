import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronLeft, User, Mail, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChat, ChatProvider } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";

interface ChatbotMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestedActions?: string[];
  collectData?: {
    field: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'file';
    options?: string[];
    required?: boolean;
  };
}

interface ChatAgent {
  id: string;
  name: string;
  displayName: string;
  type: 'general' | 'juris' | 'support' | 'custom';
  description?: string;
  avatar?: string;
  welcomeMessage?: string;
  status: string;
}

async function getChatbotResponse(message: string, agentType?: string): Promise<{
  reply: string;
  suggestedActions?: string[];
  escalateToHuman?: boolean;
  collectData?: ChatbotMessage['collectData'];
  agent?: { id: string; name: string; type: string };
}> {
  try {
    const response = await fetch('/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, agentType }),
    });
    if (!response.ok) throw new Error('Failed to get response');
    return await response.json();
  } catch (error) {
    console.error('Chatbot error:', error);
    return {
      reply: "I'm having trouble responding right now. Would you like to speak with a human agent?",
      suggestedActions: ['Speak to Agent'],
    };
  }
}

async function fetchChatAgents(): Promise<ChatAgent[]> {
  try {
    const response = await fetch('/api/chat-agents');
    if (!response.ok) throw new Error('Failed to fetch agents');
    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error('Failed to fetch chat agents:', error);
    return [];
  }
}

const agents = [
  { name: "General", role: "General Assistant", type: "general", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/a3b38c132_General.png", greeting: "Hi! I'm your General Assistant. Ask me anything about Finatrades, or select a specialist agent below!", active: true },
  { name: "Juris", role: "Registration & KYC", type: "juris", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/14133f560_Juris.png", greeting: "Welcome! I'm Juris, your registration and verification assistant. I can help you create an account or complete KYC verification.", active: true },
  { name: "Vaultis", role: "Vault Management", type: "support", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/3c982361e_QC.png", greeting: "Hello! I'm Vaultis, your Vault Management specialist.", active: false },
  { name: "Payis", role: "Payments & Wallet", type: "support", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/f37044cf5_Payis.png", greeting: "Hi! I'm Payis, your Payments & Wallet specialist.", active: false },
  { name: "Tradis", role: "Trade Finance", type: "support", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/848368285_tradis.png", greeting: "Hello! I'm Tradis, your Trade Finance specialist.", active: false },
  { name: "Logis", role: "Logistics & Documentation", type: "support", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/f58a17b2a_Logis.png", greeting: "Hello! I'm Logis, handling Logistics & Documentation.", active: false },
  { name: "Markis", role: "Market Intelligence", type: "support", image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/643f01b2a_Markis.png", greeting: "Greetings! I'm Markis, your Market Intelligence expert.", active: false }
];

interface GuestInfo {
  name: string;
  email: string;
}

function FloatingAgentChatContent() {
  const { user } = useAuth();
  const { currentSession, sendMessage, createSession, selectSession, sessions, startGuestSession, guestId } = useChat();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(agents[0]);
  const [showAgentList, setShowAgentList] = useState(false);
  const [message, setMessage] = useState("");
  const [showNotification, setShowNotification] = useState(true);
  const [comingSoonAgent, setComingSoonAgent] = useState<typeof agents[0] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  
  // Chatbot state
  const [chatbotMessages, setChatbotMessages] = useState<ChatbotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useHumanAgent, setUseHumanAgent] = useState(false);

  // Auto-hide notification after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, chatbotMessages, currentSession?.messages]);

  const openChat = () => {
    setIsOpen(true);
    setShowNotification(false);
    
    // For guests (not logged in), always ask for name and email first
    if (!user && !guestInfo) {
      setShowGuestForm(true);
      return;
    }
    
    // Show greeting if no messages yet
    if (chatbotMessages.length === 0 && !useHumanAgent) {
      const greeting: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: user 
          ? `Hello ${user.firstName}! I'm your Finatrades assistant. I can help you with:\n\n• Buying and selling gold\n• Account questions\n• Fees and limits\n• FinaVault storage\n• BNSL plans\n\nHow can I assist you today?`
          : guestInfo
            ? `Hello ${guestInfo.name}! I'm your Finatrades assistant. I can help you with:\n\n• Buying and selling gold\n• Account questions\n• Fees and limits\n• FinaVault storage\n• BNSL plans\n\nHow can I assist you today?`
            : "Hello! I'm your Finatrades assistant. How can I assist you today?",
        timestamp: new Date(),
        suggestedActions: ['How to buy gold?', 'What are the fees?', 'Tell me about BNSL']
      };
      setChatbotMessages([greeting]);
    }
    
    // For human agent mode, set up session
    if (useHumanAgent) {
      if (user) {
        const existingSession = sessions.find(s => s.userId === user.id);
        if (existingSession) {
          selectSession(existingSession.id);
        } else {
          const sessionId = createSession(user.id, `${user.firstName} ${user.lastName}`);
          selectSession(sessionId);
          sendMessage(currentAgent.greeting, 'agent', sessionId);
        }
      } else if (guestInfo) {
        const existingSession = sessions.find(s => s.userName === guestInfo.name);
        if (existingSession) {
          selectSession(existingSession.id);
        }
      }
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    
    const info: GuestInfo = { name: guestName.trim(), email: guestEmail.trim() };
    setGuestInfo(info);
    setShowGuestForm(false);
    
    // For AI chatbot mode, show personalized greeting
    if (!useHumanAgent) {
      const greeting: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: `Hello ${info.name}! I'm your Finatrades assistant. I can help you with:\n\n• Buying and selling gold\n• Account questions\n• Fees and limits\n• FinaVault storage\n• BNSL plans\n\nHow can I assist you today?`,
        timestamp: new Date(),
        suggestedActions: ['How to buy gold?', 'What are the fees?', 'Tell me about BNSL']
      };
      setChatbotMessages([greeting]);
      return;
    }
    
    // For human agent mode, start session
    const sessionId = startGuestSession(info.name, info.email);
    if (sessionId) {
      setTimeout(() => {
        sendMessage(`Guest: ${info.name} (${info.email})`, 'agent', sessionId);
        sendMessage(currentAgent.greeting, 'agent', sessionId);
      }, 1000);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setShowAgentList(false);
    setShowGuestForm(false);
  };

  const switchAgent = (agent: typeof agents[0]) => {
    setCurrentAgent(agent);
    setShowAgentList(false);
    
    // Clear chatbot messages and show new agent's greeting
    const greeting: ChatbotMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: agent.greeting,
      timestamp: new Date(),
      suggestedActions: agent.type === 'juris' 
        ? ['Create Account', 'Start KYC', 'Check Requirements']
        : ['How to buy gold?', 'What are the fees?', 'Tell me about BNSL']
    };
    setChatbotMessages([greeting]);
    setUseHumanAgent(false);
  };
  
  const escalateToHuman = useCallback(() => {
    setUseHumanAgent(true);
    setChatbotMessages(prev => [...prev, {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: "Connecting you with a human agent. Please wait a moment...",
      timestamp: new Date()
    }]);
    
    // Set up human chat session
    if (user) {
      const existingSession = sessions.find(s => s.userId === user.id);
      if (existingSession) {
        selectSession(existingSession.id);
      } else {
        const sessionId = createSession(user.id, `${user.firstName} ${user.lastName}`);
        selectSession(sessionId);
        sendMessage("User requested to speak with a human agent.", 'agent', sessionId);
      }
    } else {
      setShowGuestForm(true);
    }
  }, [user, sessions, selectSession, createSession, sendMessage]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    setMessage("");
    
    // If using human agent, use the socket-based chat
    if (useHumanAgent) {
      sendMessage(userMessage, 'user');
      return;
    }
    
    // Add user message to chatbot
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    // Get chatbot response - pass current agent type for routing
    const response = await getChatbotResponse(userMessage, currentAgent.type);
    
    // Add bot response
    const botMsg: ChatbotMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: response.reply,
      timestamp: new Date(),
      suggestedActions: response.suggestedActions
    };
    setChatbotMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
    
    // Handle escalation
    if (response.escalateToHuman) {
      setTimeout(() => escalateToHuman(), 1500);
    }
  }, [message, useHumanAgent, sendMessage, escalateToHuman]);
  
  const handleQuickAction = useCallback(async (action: string) => {
    if (action === 'Speak to Agent') {
      escalateToHuman();
      return;
    }
    
    // Add user message
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: action,
      timestamp: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    // Get chatbot response - pass current agent type for routing
    const response = await getChatbotResponse(action, currentAgent.type);
    
    const botMsg: ChatbotMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: response.reply,
      timestamp: new Date(),
      suggestedActions: response.suggestedActions
    };
    setChatbotMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  }, [escalateToHuman]);

  const displayMessages = useHumanAgent 
    ? (currentSession?.messages || [])
    : chatbotMessages;

  return (
    <>
      {/* Notification Bubble */}
      <AnimatePresence>
        {showNotification && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-50 bg-popover border border-border rounded-2xl shadow-xl p-4 min-w-[220px]"
          >
            <button
              onClick={() => setShowNotification(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors border border-border"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/d8fcee3ed_FinatradesAIAgents.png"
                alt="Finatrades AI"
                className="w-12 h-12 object-contain"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Hey, I'm here! 👋</p>
                <p className="text-xs text-muted-foreground">Need any help?</p>
              </div>
            </div>
            {/* Arrow pointer */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-popover border-r border-b border-border transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ 
              scale: 1,
              y: [0, -8, 0]
            }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            transition={{
              y: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            onClick={openChat}
            className="fixed bottom-6 right-6 z-50 w-20 h-20 flex items-center justify-center"
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69293bd8e52dce0074daa668/d8fcee3ed_FinatradesAIAgents.png"
              alt="Chat"
              className="w-20 h-20 object-contain drop-shadow-2xl"
            />
            <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-background border border-border rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-[#FF2FBF] p-4 flex items-center gap-3">
              {showAgentList ? (
                <>
                  <button
                    onClick={() => setShowAgentList(false)}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">Select Agent</h3>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-full bg-white/20 overflow-hidden cursor-pointer hover:ring-2 ring-white/50 transition-all"
                    onClick={() => setShowAgentList(true)}
                  >
                    <img
                      src={currentAgent.image}
                      alt={currentAgent.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setShowAgentList(true)}
                  >
                    <h3 className="text-white font-semibold">{currentAgent.name}</h3>
                    <p className="text-white/80 text-xs">{currentAgent.role} • Click to switch</p>
                  </div>
                </>
              )}
              <button
                onClick={closeChat}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {showAgentList ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-96 overflow-y-auto p-3 space-y-2 bg-background"
                >
                  {agents.map((agent, idx) => (
                    <div
                      key={idx}
                      onClick={() => agent.active ? switchAgent(agent) : setComingSoonAgent(agent)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        currentAgent.name === agent.name
                          ? 'bg-primary/10 border border-primary/50'
                          : 'bg-muted hover:bg-muted/80 border border-transparent'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 relative ${!agent.active ? 'grayscale' : ''}`}>
                        <img
                          src={agent.image}
                          alt={agent.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-foreground font-medium text-sm">{agent.name}</h4>
                          {!agent.active && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-muted border border-border text-muted-foreground rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">{agent.role}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : showGuestForm ? (
                <motion.div
                  key="guest-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-background p-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-[#FF2FBF] flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Start a Conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1">Please enter your details to begin chatting</p>
                  </div>
                  <form onSubmit={handleGuestSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest-name" className="text-foreground">Your Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="guest-name"
                          type="text"
                          placeholder="Enter your name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="input-guest-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-email" className="text-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="guest-email"
                          type="email"
                          placeholder="Enter your email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="input-guest-email"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-[#FF2FBF] hover:opacity-90"
                      disabled={!guestName.trim() || !guestEmail.trim()}
                      data-testid="button-start-chat"
                    >
                      Start Chat
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-background"
                >
                  {/* Chat Messages */}
                  <div className="h-72 overflow-y-auto p-4 space-y-3">
                    {displayMessages.map((msg, idx) => {
                      const isUser = msg.sender === 'user';
                      const isBot = 'suggestedActions' in msg;
                      const chatbotMsg = msg as ChatbotMessage;
                      
                      return (
                        <motion.div
                          key={msg.id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="flex flex-col gap-2 max-w-[85%]">
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                isUser
                                  ? 'bg-gradient-to-r from-primary to-[#FF2FBF] text-white'
                                  : 'bg-muted text-foreground border border-border'
                              }`}
                            >
                              {!isUser && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Bot className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-medium text-primary">Assistant</span>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {/* Quick Actions */}
                            {isBot && chatbotMsg.suggestedActions && chatbotMsg.suggestedActions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {chatbotMsg.suggestedActions.map((action, actionIdx) => (
                                  <button
                                    key={actionIdx}
                                    onClick={() => handleQuickAction(action)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                    data-testid={`quick-action-${actionIdx}`}
                                  >
                                    {action}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    {/* Loading indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted text-foreground border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Actions Bar - only show for chatbot */}
                  {!useHumanAgent && (
                    <div className="px-4 py-2 border-t border-border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => escalateToHuman()}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors border border-secondary/20"
                          data-testid="speak-to-agent"
                        >
                          Speak to Agent
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-4 border-t border-border flex gap-2 bg-background">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                      placeholder={useHumanAgent ? "Message support..." : "Ask me anything..."}
                      className="flex-1 bg-muted border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                      disabled={isLoading}
                      data-testid="input-chat-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-primary to-[#FF2FBF] hover:opacity-90"
                      disabled={isLoading || !message.trim()}
                      data-testid="button-send-message"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coming Soon Popup */}
      <AnimatePresence>
        {comingSoonAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setComingSoonAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Agent Image */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary shadow-lg">
                  <img
                    src={comingSoonAgent.image}
                    alt={comingSoonAgent.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <span className="inline-block px-3 py-1 text-xs font-medium bg-muted border border-border text-muted-foreground rounded-full mb-3">
                  Coming Soon
                </span>
                <h3 className="text-xl font-bold text-foreground mb-1">{comingSoonAgent.name}</h3>
                <p className="text-secondary text-sm mb-3">{comingSoonAgent.role}</p>
                <p className="text-muted-foreground text-sm mb-6">
                  {comingSoonAgent.name} is currently under development and will be available soon with advanced capabilities for {comingSoonAgent.role.toLowerCase()}.
                </p>

                {/* Features Preview */}
                <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left border border-border">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Upcoming Features</p>
                  <ul className="space-y-2">
                    {comingSoonAgent.name === "Vaultis" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Gold storage management</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Vault allocation tracking</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Certificate verification</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Payis" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Payment initiation</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Transaction tracking</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Wallet management</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Tradis" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Trade document generation</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Deal structuring assistance</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Settlement coordination</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Juris" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Compliance checks</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Regulatory guidance</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Legal document review</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Logis" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Shipment tracking</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Documentation handling</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Delivery coordination</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Markis" && (
                      <>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Market analysis</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Price predictions</li>
                        <li className="text-muted-foreground text-sm flex items-center gap-2">• Trend insights</li>
                      </>
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => setComingSoonAgent(null)}
                  className="w-full bg-gradient-to-r from-primary to-[#FF2FBF] hover:opacity-90 text-white"
                >
                  Got it, thanks!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function FloatingAgentChat() {
  return (
    <ChatProvider>
      <FloatingAgentChatContent />
    </ChatProvider>
  );
}
