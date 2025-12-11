import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Search, Send, MoreVertical, Phone, Video, Clock, CheckCheck, User } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { format } from 'date-fns';

export default function AdminChat() {
  const { sessions, currentSession, selectSession, sendMessage } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredSessions = sessions.filter(session => 
    session.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentSession) return;
    sendMessage(messageInput, 'admin', currentSession.id);
    setMessageInput('');
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        
        {/* Sidebar - Chat List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="font-bold text-lg mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredSessions.map(session => (
              <div 
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                  currentSession?.id === session.id ? 'bg-orange-50 hover:bg-orange-50 border-l-4 border-l-orange-500' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-gray-200">
                      <AvatarImage src={session.userAvatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-600">
                        {session.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className={`font-semibold text-sm ${currentSession?.id === session.id ? 'text-orange-900' : 'text-gray-900'}`}>
                        {session.userName}
                      </h3>
                      <p className="text-xs text-gray-500 truncate max-w-[140px]">
                        {session.messages[session.messages.length - 1]?.content || 'No messages'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-400">
                      {session.lastMessageAt && format(new Date(session.lastMessageAt), 'HH:mm')}
                    </span>
                    {session.unreadCount > 0 && (
                      <Badge className="bg-orange-500 hover:bg-orange-600 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                        {session.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredSessions.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No conversations found
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {currentSession ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-gray-200">
                    <AvatarImage src={currentSession.userAvatar} />
                    <AvatarFallback className="bg-slate-900 text-white">
                      {currentSession.userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-gray-900">{currentSession.userName}</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {currentSession.messages.map((msg, index) => {
                  const isAdmin = msg.sender === 'admin' || msg.sender === 'agent';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex flex-col max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className={`
                          px-4 py-3 rounded-2xl text-sm shadow-sm
                          ${isAdmin 
                            ? 'bg-orange-500 text-white rounded-tr-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                          }
                        `}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                          {isAdmin && (
                            <CheckCheck className="w-3 h-3 text-orange-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Type your reply..." 
                    className="flex-1 bg-gray-50 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
