import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronLeft, User, Mail, Bot, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChat, ChatProvider } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { CallOverlay, IncomingCallModal } from "@/components/chat/CallOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";

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
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
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

const quickChips = [
  { label: "Gold Price", icon: "📊" },
  { label: "My Balance", icon: "💰" },
  { label: "Buy Gold", icon: "🪙" },
  { label: "Support", icon: "🤝" },
];

interface GuestInfo {
  name: string;
  email: string;
}

function BotAvatar({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <img src="/favicon.webp" alt="FT" className={`${sizeClass} rounded-full shadow-md flex-shrink-0 object-cover`} />
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2 max-w-[85%]">
        <BotAvatar size="sm" />
        <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

function FloatingAgentChatContent() {
  const { user } = useAuth();
  const { currentSession, sendMessage, createSession, selectSession, sessions, startGuestSession, guestId, incomingCall, acceptCall, rejectCall, activeCall } = useChat();
  const isMobile = useIsMobile();
  
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
  
  const [chatbotMessages, setChatbotMessages] = useState<ChatbotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useHumanAgent, setUseHumanAgent] = useState(false);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

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

  const showGreeting = useCallback((userName?: string) => {
    if (chatbotMessages.length === 0 && !useHumanAgent) {
      const greeting: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: `Hello ${userName || 'there'}! Welcome to Finatrades.\n\nI'm your AI assistant. Please select an option from the menu below:`,
        timestamp: new Date(),
        suggestedActions: [
          '1. Create Account',
          '2. Login Help',
          '3. Complete Verification',
          '4. Understand My Balance',
          '5. Add Funds',
          '6. Send Payment',
          '7. Request Payment',
          '8. View Certificates',
          '9. BNSL Plans',
          '10. FinaBridge',
          '11. Troubleshooting',
          '12. Contact Support'
        ]
      };
      setChatbotMessages([greeting]);
    }
  }, [chatbotMessages.length, useHumanAgent]);

  const openChat = () => {
    setIsOpen(true);
    setShowNotification(false);
    
    if (user) {
      showGreeting(user.firstName);
      if (useHumanAgent) {
        const existingSession = sessions.find(s => s.userId === user.id);
        if (existingSession) {
          selectSession(existingSession.id);
        } else {
          const sessionId = createSession(user.id, `${user.firstName} ${user.lastName}`);
          selectSession(sessionId);
          sendMessage(currentAgent.greeting, 'agent', sessionId);
        }
      }
      return;
    }
    
    if (!guestInfo) {
      setShowGuestForm(true);
      return;
    }
    
    showGreeting(guestInfo.name);
    
    if (useHumanAgent) {
      const existingSession = sessions.find(s => s.userName === guestInfo.name);
      if (existingSession) {
        selectSession(existingSession.id);
      }
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    
    const info: GuestInfo = { name: guestName.trim(), email: guestEmail.trim() };
    setGuestInfo(info);
    setShowGuestForm(false);
    
    if (!useHumanAgent) {
      const greeting: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: `Hello ${info.name}! Welcome to Finatrades.\n\nI'm your AI assistant. Please select an option from the menu below:`,
        timestamp: new Date(),
        suggestedActions: [
          '1. Create Account',
          '2. Login Help',
          '3. Complete Verification',
          '4. Understand My Balance',
          '5. Add Funds',
          '6. Send Payment',
          '7. Request Payment',
          '8. View Certificates',
          '9. BNSL Plans',
          '10. FinaBridge',
          '11. Troubleshooting',
          '12. Contact Support'
        ]
      };
      setChatbotMessages([greeting]);
      return;
    }
    
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
    
    if (useHumanAgent) {
      sendMessage(userMessage, 'user');
      return;
    }
    
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    const response = await getChatbotResponse(userMessage, currentAgent.type);
    
    const botMsg: ChatbotMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: response.reply,
      timestamp: new Date(),
      suggestedActions: response.suggestedActions
    };
    setChatbotMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
    
    if (response.escalateToHuman) {
      setTimeout(() => escalateToHuman(), 1500);
    }
  }, [message, useHumanAgent, sendMessage, escalateToHuman]);
  
  const handleQuickAction = useCallback(async (action: string) => {
    if (action === 'Speak to Agent') {
      escalateToHuman();
      return;
    }
    
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: action,
      timestamp: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
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

  const handleChipClick = useCallback(async (chipLabel: string) => {
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: chipLabel,
      timestamp: new Date()
    };
    setChatbotMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    const response = await getChatbotResponse(chipLabel, currentAgent.type);
    
    const botMsg: ChatbotMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      content: response.reply,
      timestamp: new Date(),
      suggestedActions: response.suggestedActions
    };
    setChatbotMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  }, [currentAgent.type]);

  const displayMessages = useHumanAgent 
    ? (currentSession?.messages || [])
    : chatbotMessages;

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      <CallOverlay 
        callerName={incomingCall?.callerName || 'Support'} 
        isVisible={!!activeCall} 
      />

      <AnimatePresence>
        {showNotification && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className={`fixed z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[220px] ${isMobile ? 'bottom-36 right-3' : 'bottom-24 right-6'}`}
          >
            <button
              onClick={() => setShowNotification(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors border border-gray-200"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-3">
              <BotAvatar size="md" />
              <div>
                <p className="text-sm font-medium text-gray-900">Hey, I'm here! 👋</p>
                <p className="text-xs text-gray-500">Need any help?</p>
              </div>
            </div>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <div className={`fixed z-50 ${isMobile ? 'bottom-20 right-3' : 'bottom-6 right-6'}`}>
            <div className="relative">
              <AnimatePresence>
                {showFabTooltip && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg"
                  >
                    Ask Finatrades Assistant
                    <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-gray-900 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={openChat}
                onMouseEnter={() => setShowFabTooltip(true)}
                onMouseLeave={() => setShowFabTooltip(false)}
                className="w-14 h-14 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] flex items-center justify-center shadow-lg shadow-violet-500/30 transition-colors"
                data-testid="button-open-chat"
              >
                <MessageCircle className="w-6 h-6 text-white" />
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white">
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={`fixed z-50 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl ${isMobile ? 'bottom-2 right-2 left-2 w-auto max-w-none max-h-[80vh]' : 'bottom-6 right-6 w-[380px] max-w-[calc(100vw-48px)]'}`}
          >
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#1e1b4b] p-4 flex items-center gap-3">
              {showAgentList ? (
                <>
                  <button
                    onClick={() => setShowAgentList(false)}
                    className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
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
                    className="cursor-pointer hover:ring-2 ring-white/30 transition-all rounded-full"
                    onClick={() => setShowAgentList(true)}
                  >
                    <BotAvatar size="md" />
                  </div>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setShowAgentList(true)}
                  >
                    <h3 className="text-white font-semibold text-sm">Finatrades Assistant</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-white/70 text-xs">Online</p>
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={closeChat}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showAgentList ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-96 overflow-y-auto p-3 space-y-2 bg-gray-50"
                >
                  {agents.map((agent, idx) => (
                    <div
                      key={idx}
                      onClick={() => agent.active ? switchAgent(agent) : setComingSoonAgent(agent)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        currentAgent.name === agent.name
                          ? 'bg-violet-50 border border-violet-200'
                          : 'bg-white hover:bg-gray-50 border border-gray-100'
                      }`}
                      data-testid={`agent-option-${agent.name.toLowerCase()}`}
                    >
                      <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative ${!agent.active ? 'grayscale' : ''}`}>
                        <img
                          src={agent.image}
                          alt={agent.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-gray-900 font-medium text-sm">{agent.name}</h4>
                          {!agent.active && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 border border-gray-200 text-gray-500 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs">{agent.role}</p>
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
                  className="bg-white p-6"
                >
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      <BotAvatar size="lg" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Hi! I'm your Finatrades Assistant</h3>
                    <p className="text-sm text-gray-500 mt-1">Ask me anything about gold trading.</p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {quickChips.map((chip) => (
                      <button
                        key={chip.label}
                        className="px-3 py-1.5 text-xs font-medium rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                        disabled
                        data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {chip.icon} {chip.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleGuestSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest-name" className="text-gray-700 text-sm">Your Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="guest-name"
                          type="text"
                          placeholder="Enter your name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="pl-10 placeholder:text-[#9CA3AF]"
                          required
                          data-testid="input-guest-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-email" className="text-gray-700 text-sm">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="guest-email"
                          type="email"
                          placeholder="Enter your email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="pl-10 placeholder:text-[#9CA3AF]"
                          required
                          data-testid="input-guest-email"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg"
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
                  className="bg-gray-50"
                >
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
                          {isUser ? (
                            <div className="flex flex-col gap-2 max-w-[85%]">
                              <div className="rounded-2xl rounded-tr-md px-4 py-2.5 bg-[#7C3AED] text-white shadow-sm">
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 max-w-[85%]">
                              <BotAvatar size="sm" />
                              <div className="flex flex-col gap-2">
                                <div className="rounded-2xl rounded-tl-md px-4 py-2.5 bg-white text-gray-900 border border-gray-200 shadow-sm">
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {isBot && chatbotMsg.suggestedActions && chatbotMsg.suggestedActions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pl-1">
                                    {chatbotMsg.suggestedActions.map((action, actionIdx) => (
                                      <button
                                        key={actionIdx}
                                        onClick={() => handleQuickAction(action)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors border border-violet-200"
                                        data-testid={`quick-action-${actionIdx}`}
                                      >
                                        {action}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    {isLoading && <TypingIndicator />}

                    {displayMessages.length <= 1 && !isLoading && (
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        {quickChips.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => handleChipClick(chip.label)}
                            className="px-3 py-1.5 text-xs font-medium rounded-full border border-violet-200 text-violet-700 bg-white hover:bg-violet-50 transition-colors shadow-sm"
                            data-testid={`chip-${chip.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {chip.icon} {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {!useHumanAgent && (
                    <div className="px-4 py-2 border-t border-gray-200 bg-white">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => escalateToHuman()}
                          className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border border-gray-200"
                          data-testid="speak-to-agent"
                        >
                          Speak to Agent
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-4 border-t border-gray-200 flex gap-2 bg-white">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                      placeholder={useHumanAgent ? "Message support..." : "Ask me anything..."}
                      className="flex-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-[#9CA3AF] focus:border-violet-400 focus:ring-violet-400"
                      disabled={isLoading}
                      data-testid="input-chat-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
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
              className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-violet-300 shadow-lg">
                  <img
                    src={comingSoonAgent.image}
                    alt={comingSoonAgent.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="text-center">
                <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 border border-gray-200 text-gray-500 rounded-full mb-3">
                  Coming Soon
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{comingSoonAgent.name}</h3>
                <p className="text-violet-600 text-sm mb-3">{comingSoonAgent.role}</p>
                <p className="text-gray-500 text-sm mb-6">
                  {comingSoonAgent.name} is currently under development and will be available soon with advanced capabilities for {comingSoonAgent.role.toLowerCase()}.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Upcoming Features</p>
                  <ul className="space-y-2">
                    {comingSoonAgent.name === "Vaultis" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Gold storage management</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Vault allocation tracking</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Certificate verification</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Payis" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Payment initiation</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Transaction tracking</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Wallet management</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Tradis" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Trade document generation</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Deal structuring assistance</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Settlement coordination</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Juris" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Compliance checks</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Regulatory guidance</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Legal document review</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Logis" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Shipment tracking</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Documentation handling</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Delivery coordination</li>
                      </>
                    )}
                    {comingSoonAgent.name === "Markis" && (
                      <>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Market analysis</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Price predictions</li>
                        <li className="text-gray-600 text-sm flex items-center gap-2">• Trend insights</li>
                      </>
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => setComingSoonAgent(null)}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg"
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
