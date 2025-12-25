import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Send, MoreVertical, Phone, Video, Clock, CheckCheck, User, PhoneOff, PhoneIncoming, Bot, Settings, MessageSquare, Activity, Edit2, Save, BookOpen, Plus, Trash2, Eye, EyeOff, FileText, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChat, ChatProvider } from '@/context/ChatContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ChatAgent {
  id: string;
  name: string;
  displayName: string;
  type: 'general' | 'juris' | 'support' | 'custom';
  description: string | null;
  avatar: string | null;
  welcomeMessage: string | null;
  capabilities: string[];
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function parseCapabilities(capabilities: string | string[] | null): string[] {
  if (!capabilities) return [];
  if (Array.isArray(capabilities)) return capabilities;
  try {
    return JSON.parse(capabilities);
  } catch {
    return [];
  }
}

function AgentManagement() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    description: '',
    welcomeMessage: '',
    status: 'active'
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/chat-agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast({ title: 'Error', description: 'Failed to load chat agents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agent: ChatAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/chat-agents/${agent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update agent');
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
      toast({ title: 'Success', description: `${agent.displayName} is now ${newStatus}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update agent status', variant: 'destructive' });
    }
  };

  const openEditDialog = (agent: ChatAgent) => {
    setEditingAgent(agent);
    setEditForm({
      displayName: agent.displayName,
      description: agent.description || '',
      welcomeMessage: agent.welcomeMessage || '',
      status: agent.status
    });
  };

  const saveAgentChanges = async () => {
    if (!editingAgent) return;
    try {
      const response = await fetch(`/api/chat-agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });
      if (!response.ok) throw new Error('Failed to update agent');
      const updatedAgent = await response.json();
      setAgents(prev => prev.map(a => a.id === editingAgent.id ? updatedAgent.agent : a));
      setEditingAgent(null);
      toast({ title: 'Success', description: 'Agent updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update agent', variant: 'destructive' });
    }
  };

  const getAgentTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-700';
      case 'juris': return 'bg-purple-100 text-purple-700';
      case 'support': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.isDefault).length}</p>
                <p className="text-sm text-muted-foreground">Default Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Chat Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`agent-row-${agent.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {agent.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{agent.displayName}</h3>
                      <Badge className={getAgentTypeColor(agent.type)} variant="outline">
                        {agent.type}
                      </Badge>
                      {agent.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {parseCapabilities(agent.capabilities as any).slice(0, 3).map((cap, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">{cap}</span>
                      ))}
                      {parseCapabilities(agent.capabilities as any).length > 3 && (
                        <span className="text-xs text-muted-foreground">+{parseCapabilities(agent.capabilities as any).length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`status-${agent.id}`} className="text-sm text-muted-foreground">
                      {agent.status === 'active' ? 'Active' : 'Inactive'}
                    </Label>
                    <Switch
                      id={`status-${agent.id}`}
                      checked={agent.status === 'active'}
                      onCheckedChange={() => toggleAgentStatus(agent)}
                      data-testid={`switch-agent-status-${agent.id}`}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(agent)} data-testid={`button-edit-agent-${agent.id}`}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No chat agents configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingAgent?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={editForm.displayName}
                onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                data-testid="input-agent-display-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                data-testid="input-agent-description"
              />
            </div>
            <div>
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                value={editForm.welcomeMessage}
                onChange={(e) => setEditForm(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                rows={3}
                data-testid="input-agent-welcome-message"
              />
            </div>
            <Button onClick={saveAgentChanges} className="w-full" data-testid="button-save-agent">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface KnowledgeCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

interface KnowledgeArticle {
  id: string;
  categoryId: string | null;
  title: string;
  summary: string | null;
  content: string;
  keywords: string | null;
  status: 'draft' | 'published' | 'archived';
  agentTypes: string | null;
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

function KnowledgeBaseManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [articleForm, setArticleForm] = useState({
    categoryId: '',
    title: '',
    summary: '',
    content: '',
    keywords: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    agentTypes: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, artRes] = await Promise.all([
        fetch('/api/knowledge/categories'),
        fetch('/api/knowledge/articles')
      ]);
      
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData.articles || []);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setEditingArticle(null);
    setArticleForm({
      categoryId: '',
      title: '',
      summary: '',
      content: '',
      keywords: '',
      status: 'draft',
      agentTypes: []
    });
  };

  const openEditDialog = (article: KnowledgeArticle) => {
    setIsCreating(false);
    setEditingArticle(article);
    let agentTypesArray: string[] = [];
    if (article.agentTypes) {
      try { agentTypesArray = JSON.parse(article.agentTypes); } catch {}
    }
    let keywordsStr = '';
    if (article.keywords) {
      try { keywordsStr = JSON.parse(article.keywords).join(', '); } catch { keywordsStr = article.keywords; }
    }
    setArticleForm({
      categoryId: article.categoryId || '',
      title: article.title,
      summary: article.summary || '',
      content: article.content,
      keywords: keywordsStr,
      status: article.status,
      agentTypes: agentTypesArray
    });
  };

  const saveArticle = async () => {
    if (!articleForm.title || !articleForm.content) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        ...articleForm,
        keywords: articleForm.keywords ? articleForm.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      };

      const url = editingArticle 
        ? `/api/knowledge/articles/${editingArticle.id}` 
        : '/api/knowledge/articles';
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save article');

      toast({ title: 'Success', description: `Article ${editingArticle ? 'updated' : 'created'} successfully` });
      setEditingArticle(null);
      setIsCreating(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save article', variant: 'destructive' });
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const response = await fetch(`/api/knowledge/articles/${id}`, { 
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete');
      setArticles(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Success', description: 'Article deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete article', variant: 'destructive' });
    }
  };

  const toggleArticleStatus = async (article: KnowledgeArticle) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      const response = await fetch(`/api/knowledge/articles/${article.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update');
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
      toast({ title: 'Success', description: `Article ${newStatus === 'published' ? 'published' : 'unpublished'}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update article status', variant: 'destructive' });
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading knowledge base...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Knowledge Base Articles
            </CardTitle>
            <Button onClick={openCreateDialog} data-testid="button-create-article">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{articles.length}</div>
                <div className="text-sm text-blue-600">Total Articles</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {articles.filter(a => a.status === 'published').length}
                </div>
                <div className="text-sm text-green-600">Published</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">{categories.length}</div>
                <div className="text-sm text-purple-600">Categories</div>
              </CardContent>
            </Card>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No articles yet. Create your first knowledge base article.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div 
                  key={article.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  data-testid={`article-row-${article.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{article.title}</h3>
                      <Badge className={getStatusColor(article.status)}>{article.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {getCategoryName(article.categoryId)}
                      </span>
                      <span>{article.viewCount} views</span>
                      <span>{article.helpfulCount} helpful</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleArticleStatus(article)}
                      title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                      data-testid={`button-toggle-article-${article.id}`}
                    >
                      {article.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditDialog(article)}
                      data-testid={`button-edit-article-${article.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteArticle(article.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-article-${article.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreating || !!editingArticle} onOpenChange={() => { setEditingArticle(null); setIsCreating(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="article-title">Title</Label>
                <Input
                  id="article-title"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Article title"
                  data-testid="input-article-title"
                />
              </div>
              <div>
                <Label htmlFor="article-category">Category</Label>
                <select
                  id="article-category"
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={articleForm.categoryId}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  data-testid="select-article-category"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="article-summary">Summary</Label>
              <Input
                id="article-summary"
                value={articleForm.summary}
                onChange={(e) => setArticleForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief summary for search results"
                data-testid="input-article-summary"
              />
            </div>
            <div>
              <Label htmlFor="article-content">Content</Label>
              <Textarea
                id="article-content"
                value={articleForm.content}
                onChange={(e) => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Full article content..."
                rows={8}
                data-testid="input-article-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="article-keywords">Keywords (comma-separated)</Label>
                <Input
                  id="article-keywords"
                  value={articleForm.keywords}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="gold, trading, wallet"
                  data-testid="input-article-keywords"
                />
              </div>
              <div>
                <Label htmlFor="article-status">Status</Label>
                <select
                  id="article-status"
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={articleForm.status}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, status: e.target.value as any }))}
                  data-testid="select-article-status"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Agent Types (which agents can use this article)</Label>
              <div className="flex gap-4 mt-2">
                {['general', 'juris', 'support'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={articleForm.agentTypes.includes(type)}
                      onChange={(e) => {
                        setArticleForm(prev => ({
                          ...prev,
                          agentTypes: e.target.checked 
                            ? [...prev.agentTypes, type]
                            : prev.agentTypes.filter(t => t !== type)
                        }));
                      }}
                      className="rounded"
                      data-testid={`checkbox-agent-type-${type}`}
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={saveArticle} className="w-full" data-testid="button-save-article">
              <Save className="w-4 h-4 mr-2" />
              {editingArticle ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationsPanel() {
  const { sessions, currentSession, selectSession, sendMessage, initiateCall, activeCall, endCall, isConnected, isTyping, incomingCall, acceptCall, rejectCall } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredSessions = sessions.filter(session => {
    const name = session.userName || session.guestName || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
    <>
      {/* Incoming Call Modal */}
      <Dialog open={!!incomingCall} onOpenChange={() => rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneIncoming className="w-5 h-5 text-green-500 animate-pulse" />
              Incoming {incomingCall?.callType === 'video' ? 'Video' : 'Audio'} Call
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-lg font-semibold">{incomingCall?.callerName}</p>
            <p className="text-sm text-gray-500">is calling you...</p>
          </div>
          <div className="flex justify-center gap-4">
            <Button 
              variant="destructive" 
              size="lg" 
              onClick={rejectCall}
              className="rounded-full w-14 h-14"
              data-testid="button-reject-call"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button 
              size="lg" 
              onClick={acceptCall}
              className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600"
              data-testid="button-accept-call"
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {activeCall.callType === 'video' ? (
                <Video className="w-12 h-12 text-purple-500" />
              ) : (
                <Phone className="w-12 h-12 text-purple-500" />
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {activeCall.callType === 'video' ? 'Video' : 'Audio'} Call Active
            </h2>
            <p className="text-gray-500 mb-6">Connected to user</p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="destructive" 
                size="lg"
                onClick={endCall}
                className="rounded-full px-8"
                data-testid="button-end-call"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  currentSession?.id === session.id ? 'bg-purple-50 hover:bg-purple-50 border-l-4 border-l-purple-500' : 'border-l-4 border-l-transparent'
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
                      <h3 className={`font-semibold text-sm ${currentSession?.id === session.id ? 'text-purple-900' : 'text-gray-900'}`}>
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
                      <Badge className="bg-purple-500 hover:bg-purple-600 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
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
                      <span className={`w-2 h-2 rounded-full ${currentSession.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-500">{currentSession.isOnline ? 'Online' : 'Offline'}</span>
                      {isConnected && <span className="text-[10px] text-green-500">Connected</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`hover:text-gray-600 ${activeCall ? 'text-red-500' : 'text-gray-400'}`}
                    onClick={() => activeCall ? endCall() : initiateCall(currentSession.id, 'audio')}
                    data-testid="button-audio-call"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`hover:text-gray-600 ${activeCall?.callType === 'video' ? 'text-red-500' : 'text-gray-400'}`}
                    onClick={() => activeCall ? endCall() : initiateCall(currentSession.id, 'video')}
                    data-testid="button-video-call"
                  >
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
                            ? 'bg-purple-500 text-white rounded-tr-none' 
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
                            <CheckCheck className="w-3 h-3 text-purple-500" />
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
                    className="flex-1 bg-gray-50 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    className="bg-purple-500 hover:bg-purple-600 text-white"
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
    </>
  );
}

function AdminChatContent() {
  return (
    <AdminLayout>
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="agents" className="flex items-center gap-2" data-testid="tab-agents">
            <Bot className="w-4 h-4" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2" data-testid="tab-knowledge">
            <BookOpen className="w-4 h-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2" data-testid="tab-conversations">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents">
          <AgentManagement />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeBaseManagement />
        </TabsContent>
        
        <TabsContent value="conversations">
          <ConversationsPanel />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

export default function AdminChat() {
  return (
    <ChatProvider>
      <AdminChatContent />
    </ChatProvider>
  );
}
