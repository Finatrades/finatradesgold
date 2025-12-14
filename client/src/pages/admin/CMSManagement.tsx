import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  Layout, 
  Mail, 
  Award,
  Bell,
  Layers,
  Save,
  Eye,
  EyeOff,
  MousePointer,
  BarChart3,
  Link2,
  Tag,
  List,
  Type,
  Hash,
  Image,
  Zap,
  ChevronDown,
  LayoutDashboard,
  Wallet,
  Database,
  TrendingUp,
  CreditCard,
  User,
  Settings
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ContentPage, ContentBlock, Template } from '@shared/schema';

type ContentPageWithBlocks = ContentPage & { blocks?: ContentBlock[] };

export default function CMSManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pages');
  
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['/api/admin/cms/pages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cms/pages');
      return res.json();
    }
  });

  const { data: blocksData, isLoading: blocksLoading } = useQuery({
    queryKey: ['/api/admin/cms/blocks'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cms/blocks');
      return res.json();
    }
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/cms/templates'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cms/templates');
      return res.json();
    }
  });

  const { data: brandingData, isLoading: brandingLoading } = useQuery({
    queryKey: ['/api/branding'],
    queryFn: async () => {
      const res = await fetch('/api/branding');
      return res.json();
    }
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branding'] });
      toast({ title: 'Branding updated successfully' });
    }
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: Partial<ContentPage>) => {
      const res = await fetch('/api/admin/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      toast({ title: 'Page created successfully' });
      setPageDialogOpen(false);
      setEditingPage(null);
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContentPage> }) => {
      const res = await fetch(`/api/admin/cms/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      toast({ title: 'Page updated successfully' });
      setPageDialogOpen(false);
      setEditingPage(null);
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cms/pages/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      toast({ title: 'Page deleted successfully' });
    }
  });

  const createBlockMutation = useMutation({
    mutationFn: async (data: Partial<ContentBlock>) => {
      const res = await fetch('/api/admin/cms/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/blocks'] });
      toast({ title: 'Content block created successfully' });
      setBlockDialogOpen(false);
      setEditingBlock(null);
    }
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContentBlock> }) => {
      const res = await fetch(`/api/admin/cms/blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/blocks'] });
      toast({ title: 'Content block updated successfully' });
      setBlockDialogOpen(false);
      setEditingBlock(null);
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cms/blocks/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/blocks'] });
      toast({ title: 'Content block deleted successfully' });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<Template>) => {
      const res = await fetch('/api/admin/cms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/templates'] });
      toast({ title: 'Template created successfully' });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Template> }) => {
      const res = await fetch(`/api/admin/cms/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/templates'] });
      toast({ title: 'Template updated successfully' });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cms/templates/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/templates'] });
      toast({ title: 'Template deleted successfully' });
    }
  });

  const pages: ContentPage[] = pagesData?.pages || [];
  const blocks: ContentBlock[] = blocksData?.blocks || [];
  const templates: Template[] = templatesData?.templates || [];

  const filteredBlocks = selectedPageId 
    ? blocks.filter(b => b.pageId === selectedPageId)
    : blocks;

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'certificate': return <Award className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'page_section': return <Layout className="w-4 h-4" />;
      case 'invoice': return <FileText className="w-4 h-4" />;
      case 'financial_report': return <BarChart3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-cms-title">Content Management</h1>
            <p className="text-gray-500 mt-1">Manage website content, blocks, and templates</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="pages" className="flex gap-2" data-testid="tab-pages">
              <FileText className="w-4 h-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="blocks" className="flex gap-2" data-testid="tab-blocks">
              <Layers className="w-4 h-4" />
              Blocks
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex gap-2" data-testid="tab-templates">
              <Layout className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex gap-2" data-testid="tab-branding">
              <Settings className="w-4 h-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Content Pages</h2>
              <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPage(null)} data-testid="button-add-page">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Page
                  </Button>
                </DialogTrigger>
                <PageDialog 
                  page={editingPage}
                  onSave={(data) => {
                    if (editingPage) {
                      updatePageMutation.mutate({ id: editingPage.id, data });
                    } else {
                      createPageMutation.mutate(data);
                    }
                  }}
                  isPending={createPageMutation.isPending || updatePageMutation.isPending}
                />
              </Dialog>
            </div>

            <div className="grid gap-4">
              {pagesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading pages...</div>
              ) : pages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No content pages yet. Create your first page to get started.
                  </CardContent>
                </Card>
              ) : (
                pages.map((page) => (
                  <Card key={page.id} data-testid={`card-page-${page.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{page.title}</CardTitle>
                          <CardDescription>/{page.slug}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={page.isActive ? "default" : "secondary"}>
                            {page.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingPage(page);
                              setPageDialogOpen(true);
                            }}
                            data-testid={`button-edit-page-${page.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Delete this page?')) {
                                deletePageMutation.mutate(page.id);
                              }
                            }}
                            data-testid={`button-delete-page-${page.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>Module: {page.module || 'General'}</span>
                        {page.description && <span>{page.description}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="blocks" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Content Blocks</h2>
                <Select value={selectedPageId || 'all'} onValueChange={(v) => setSelectedPageId(v === 'all' ? null : v)}>
                  <SelectTrigger className="w-[200px]" data-testid="select-filter-page">
                    <SelectValue placeholder="Filter by page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingBlock(null)} data-testid="button-add-block">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Block
                  </Button>
                </DialogTrigger>
                <BlockDialog 
                  block={editingBlock}
                  pages={pages}
                  onSave={(data) => {
                    if (editingBlock) {
                      updateBlockMutation.mutate({ id: editingBlock.id, data });
                    } else {
                      createBlockMutation.mutate(data);
                    }
                  }}
                  isPending={createBlockMutation.isPending || updateBlockMutation.isPending}
                />
              </Dialog>
            </div>

            {/* Quick Add Templates */}
            <QuickAddTemplates 
              pages={pages}
              existingBlocks={blocks}
              onAddBlock={(data) => createBlockMutation.mutate(data)}
              isPending={createBlockMutation.isPending}
            />

            <div className="grid gap-4">
              {blocksLoading ? (
                <div className="text-center py-8 text-gray-500">Loading blocks...</div>
              ) : filteredBlocks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No content blocks yet. Create blocks to add editable content sections.
                  </CardContent>
                </Card>
              ) : (
                filteredBlocks.map((block) => (
                  <Card key={block.id} data-testid={`card-block-${block.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {block.key}
                            <Badge variant="outline" className="text-xs">{block.type}</Badge>
                          </CardTitle>
                          <CardDescription>Section: {block.section}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={block.status === 'published' ? "default" : "secondary"}>
                            {block.status}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingBlock(block);
                              setBlockDialogOpen(true);
                            }}
                            data-testid={`button-edit-block-${block.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Delete this block?')) {
                                deleteBlockMutation.mutate(block.id);
                              }
                            }}
                            data-testid={`button-delete-block-${block.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <p className="text-gray-700 line-clamp-2">
                          {block.content || block.defaultContent || 'No content set'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Templates</h2>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingTemplate(null)} data-testid="button-add-template">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <TemplateDialog 
                  template={editingTemplate}
                  onSave={(data) => {
                    if (editingTemplate) {
                      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
                    } else {
                      createTemplateMutation.mutate(data);
                    }
                  }}
                  isPending={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                />
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {templatesLoading ? (
                <div className="text-center py-8 text-gray-500 col-span-2">Loading templates...</div>
              ) : templates.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="py-8 text-center text-gray-500">
                    No templates yet. Create templates for emails, certificates, and notifications.
                  </CardContent>
                </Card>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} data-testid={`card-template-${template.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getTemplateIcon(template.type)}
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.slug}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.status === 'published' ? "default" : "secondary"}>
                            {template.status}
                          </Badge>
                          <Badge variant="outline">{template.type}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {template.module && <span>Module: {template.module}</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateDialogOpen(true);
                            }}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Delete this template?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="branding" className="mt-6">
            <BrandingTab 
              settings={brandingData?.settings} 
              isLoading={brandingLoading}
              onSave={(data) => updateBrandingMutation.mutate(data)}
              isPending={updateBrandingMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function PageDialog({ 
  page, 
  onSave, 
  isPending 
}: { 
  page: ContentPage | null; 
  onSave: (data: Partial<ContentPage>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [description, setDescription] = useState(page?.description || '');
  const [module, setModule] = useState(page?.module || '');
  const [isActive, setIsActive] = useState(page?.isActive ?? true);

  React.useEffect(() => {
    setTitle(page?.title || '');
    setSlug(page?.slug || '');
    setDescription(page?.description || '');
    setModule(page?.module || '');
    setIsActive(page?.isActive ?? true);
  }, [page]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, slug, description, module: module || null, isActive });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{page ? 'Edit Page' : 'Create Page'}</DialogTitle>
        <DialogDescription>
          {page ? 'Update the content page settings.' : 'Create a new content page to organize your blocks.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              required
              data-testid="input-page-title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input 
              id="slug" 
              value={slug} 
              onChange={(e) => setSlug(e.target.value)}
              placeholder="page-slug"
              required
              data-testid="input-page-slug"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this page"
              data-testid="input-page-description"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="module">Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger data-testid="select-page-module">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="finavault">FinaVault</SelectItem>
                <SelectItem value="finapay">FinaPay</SelectItem>
                <SelectItem value="finabridge">FinaBridge</SelectItem>
                <SelectItem value="bnsl">BNSL</SelectItem>
                <SelectItem value="finacard">FinaCard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="isActive" 
              checked={isActive} 
              onCheckedChange={setIsActive}
              data-testid="switch-page-active"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-save-page">
            <Save className="w-4 h-4 mr-2" />
            {isPending ? 'Saving...' : 'Save Page'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function BlockDialog({ 
  block, 
  pages,
  onSave, 
  isPending 
}: { 
  block: ContentBlock | null; 
  pages: ContentPage[];
  onSave: (data: Partial<ContentBlock>) => void;
  isPending: boolean;
}) {
  const [pageId, setPageId] = useState(block?.pageId || '');
  const [section, setSection] = useState(block?.section || '');
  const [key, setKey] = useState(block?.key || '');
  const [type, setType] = useState<'text' | 'rich_text' | 'html' | 'json' | 'image'>(block?.type || 'text');
  const [content, setContent] = useState(block?.content || '');
  const [defaultContent, setDefaultContent] = useState(block?.defaultContent || '');
  const [status, setStatus] = useState<'draft' | 'published'>(block?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);

  React.useEffect(() => {
    setPageId(block?.pageId || '');
    setSection(block?.section || '');
    setKey(block?.key || '');
    setType(block?.type || 'text');
    setContent(block?.content || '');
    setDefaultContent(block?.defaultContent || '');
    setStatus(block?.status || 'draft');
  }, [block]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      pageId: pageId || null, 
      section, 
      key, 
      type, 
      content: content || null, 
      defaultContent: defaultContent || null,
      status 
    });
  };

  const displayContent = content || defaultContent || 'No content to preview';

  const renderPreview = () => {
    switch (type) {
      case 'html':
        return (
          <div 
            className="prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        );
      case 'image':
        return displayContent.startsWith('http') ? (
          <img src={displayContent} alt="Preview" className="max-w-full h-auto rounded" />
        ) : (
          <div className="text-gray-500 italic">Enter a valid image URL to preview</div>
        );
      case 'json':
        if (!displayContent || displayContent === 'No content to preview') {
          return <div className="text-gray-500 italic">Enter JSON content to preview</div>;
        }
        try {
          const parsed = JSON.parse(displayContent);
          return <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(parsed, null, 2)}</pre>;
        } catch {
          return <div className="text-amber-600 text-sm">JSON format will be validated on save</div>;
        }
      case 'rich_text':
        return (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {displayContent.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('#') ? 'font-bold text-lg' : ''}>{line}</p>
            ))}
          </div>
        );
      default:
        return <p className="text-gray-800">{displayContent}</p>;
    }
  };

  return (
    <DialogContent className="sm:max-w-[900px]">
      <DialogHeader>
        <DialogTitle>{block ? 'Edit Block' : 'Create Block'}</DialogTitle>
        <DialogDescription>
          {block ? 'Update the content block.' : 'Create a new editable content block.'}
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-4">
        <form onSubmit={handleSubmit} className={showPreview ? 'w-1/2' : 'w-full'}>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-4 py-4 pr-4">
              <div className="grid gap-2">
                <Label htmlFor="pageId">Page</Label>
                <Select value={pageId} onValueChange={setPageId}>
                  <SelectTrigger data-testid="select-block-page">
                    <SelectValue placeholder="Select page (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Input 
                    id="section" 
                    value={section} 
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="hero, features, etc."
                    required
                    data-testid="input-block-section"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="key">Key</Label>
                  <Input 
                    id="key" 
                    value={key} 
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="title, subtitle, etc."
                    required
                    data-testid="input-block-key"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Content Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger data-testid="select-block-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Plain Text</SelectItem>
                    <SelectItem value="rich_text">Rich Text</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="image">Image URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultContent">Default Content</Label>
                <Textarea 
                  id="defaultContent" 
                  value={defaultContent} 
                  onChange={(e) => setDefaultContent(e.target.value)}
                  placeholder="Default content when no override is set"
                  rows={3}
                  data-testid="input-block-default"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content Override</Label>
                <Textarea 
                  id="content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Override content (leave empty to use default)"
                  rows={4}
                  data-testid="input-block-content"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex gap-4">
                  <Button 
                    type="button"
                    variant={status === 'draft' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('draft')}
                    data-testid="button-block-draft"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Draft
                  </Button>
                  <Button 
                    type="button"
                    variant={status === 'published' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('published')}
                    data-testid="button-block-publish"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Published
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-block-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Live Preview'}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-block">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Saving...' : 'Save Block'}
            </Button>
          </DialogFooter>
        </form>
        {showPreview && (
          <div className="w-1/2 border-l pl-4">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Live Preview</span>
            </div>
            <div className="bg-white border rounded-lg p-4 min-h-[200px]">
              <div className="text-xs text-gray-400 mb-2">{section} / {key}</div>
              {renderPreview()}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

function TemplateDialog({ 
  template, 
  onSave, 
  isPending 
}: { 
  template: Template | null; 
  onSave: (data: Partial<Template>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || '');
  const [slug, setSlug] = useState(template?.slug || '');
  const [type, setType] = useState<'email' | 'certificate' | 'notification' | 'page_section' | 'invoice' | 'financial_report'>(template?.type || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [variablesText, setVariablesText] = useState(
    template?.variables?.map(v => v.name).join(', ') || ''
  );
  const [existingVariables, setExistingVariables] = useState<Array<{name: string, description: string}>>(
    template?.variables || []
  );
  const [module, setModule] = useState(template?.module || '');
  const [status, setStatus] = useState<'draft' | 'published'>(template?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setName(template?.name || '');
    setSlug(template?.slug || '');
    setType(template?.type || 'email');
    setSubject(template?.subject || '');
    setBody(template?.body || '');
    setVariablesText(template?.variables?.map(v => v.name).join(', ') || '');
    setExistingVariables(template?.variables || []);
    setModule(template?.module || '');
    setStatus(template?.status || 'draft');
    setShowPreview(false);
    setPreviewData({});
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVariableNames = variablesText.split(',').map(v => v.trim()).filter(Boolean);
    const variablesList = newVariableNames.map(varName => {
      const existing = existingVariables.find(v => v.name === varName);
      return existing || { name: varName, description: `Variable: ${varName}` };
    });
    onSave({ 
      name, 
      slug, 
      type, 
      subject: subject || null, 
      body, 
      variables: variablesList.length > 0 ? variablesList : null,
      module: module || null,
      status 
    });
  };

  const variableNames = variablesText.split(',').map(v => v.trim()).filter(Boolean);

  const getSampleValue = (varName: string) => {
    const samples: Record<string, string> = {
      user_name: 'John Smith',
      verification_code: '847293',
      amount: '50.00',
      gold_weight: '100',
      usd_value: '7,500.00',
      reference_id: 'TXN-2024-001234',
      date: new Date().toLocaleDateString(),
      certificate_number: 'CERT-2024-FT-001234',
      owner_name: 'John Smith',
      issue_date: new Date().toLocaleDateString(),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      bar_serial: 'AU-999-2024-56789',
      transaction_type: 'Buy',
      status: 'Completed',
      price: '75.50',
      duration: '12',
      case_id: 'TC-2024-0042',
      credit_limit: '250,000.00',
    };
    return previewData[varName] || samples[varName] || `[${varName}]`;
  };

  const replaceVariables = (text: string) => {
    let result = text;
    variableNames.forEach(varName => {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      result = result.replace(regex, getSampleValue(varName));
    });
    return result;
  };

  const previewSubject = subject ? replaceVariables(subject) : '';
  const previewBody = body ? replaceVariables(body) : '';

  const getPreviewStyle = () => {
    switch (type) {
      case 'email':
        return 'bg-white';
      case 'certificate':
        return 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200';
      case 'notification':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'invoice':
        return 'bg-white border-2 border-gray-300';
      case 'financial_report':
        return 'bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-slate-200';
      default:
        return 'bg-white';
    }
  };

  return (
    <DialogContent className="sm:max-w-[1000px] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogDescription>
          {template ? 'Update the template.' : 'Create a new template for emails, certificates, or notifications.'}
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-4">
        <form onSubmit={handleSubmit} className={showPreview ? 'w-1/2' : 'w-full'}>
          <ScrollArea className="max-h-[55vh]">
            <div className="grid gap-4 py-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Template name"
                    required
                    data-testid="input-template-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input 
                    id="slug" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="template-slug"
                    required
                    data-testid="input-template-slug"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger data-testid="select-template-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="page_section">Page Section</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="financial_report">Financial Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="module">Module</Label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger data-testid="select-template-module">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="finavault">FinaVault</SelectItem>
                      <SelectItem value="finapay">FinaPay</SelectItem>
                      <SelectItem value="finabridge">FinaBridge</SelectItem>
                      <SelectItem value="bnsl">BNSL</SelectItem>
                      <SelectItem value="finacard">FinaCard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {type === 'email' && (
                <div className="grid gap-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                    data-testid="input-template-subject"
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="variables">Variables (comma-separated)</Label>
                <Input 
                  id="variables" 
                  value={variablesText} 
                  onChange={(e) => setVariablesText(e.target.value)}
                  placeholder="user_name, amount, date"
                  data-testid="input-template-variables"
                />
                <p className="text-xs text-gray-500">Use &#123;&#123;variable_name&#125;&#125; in the body to insert values</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea 
                  id="body" 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Template body content..."
                  rows={8}
                  required
                  data-testid="input-template-body"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex gap-4">
                  <Button 
                    type="button"
                    variant={status === 'draft' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('draft')}
                    data-testid="button-template-draft"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Draft
                  </Button>
                  <Button 
                    type="button"
                    variant={status === 'published' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('published')}
                    data-testid="button-template-publish"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Published
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-template-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Live Preview'}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-template">
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
        {showPreview && (
          <div className="w-1/2 border-l pl-4 flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Live Preview</span>
              </div>
              <Badge variant="outline">{type}</Badge>
            </div>
            {variableNames.length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium mb-1 text-gray-600">Sample Data:</div>
                <div className="grid grid-cols-2 gap-1">
                  {variableNames.map(varName => (
                    <div key={varName} className="flex gap-1">
                      <span className="text-gray-500">{varName}:</span>
                      <Input 
                        className="h-5 text-xs px-1 py-0"
                        value={previewData[varName] || ''}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, [varName]: e.target.value }))}
                        placeholder={getSampleValue(varName)}
                        data-testid={`input-preview-${varName}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className={`rounded-lg p-4 ${getPreviewStyle()}`}>
                {type === 'email' && previewSubject && (
                  <div className="mb-3 pb-2 border-b">
                    <div className="text-xs text-gray-500">Subject:</div>
                    <div className="font-semibold">{previewSubject}</div>
                  </div>
                )}
                {type === 'certificate' && (
                  <div className="text-center mb-4">
                    <Award className="w-12 h-12 mx-auto text-amber-600" />
                  </div>
                )}
                {type === 'notification' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Notification</span>
                  </div>
                )}
                {type === 'invoice' && (
                  <div className="text-center mb-4 pb-2 border-b-2 border-orange-500">
                    <FileText className="w-10 h-10 mx-auto text-orange-600" />
                    <div className="text-lg font-bold text-gray-800 mt-2">INVOICE</div>
                  </div>
                )}
                {type === 'financial_report' && (
                  <div className="text-center mb-4 pb-2 border-b-2 border-slate-400">
                    <BarChart3 className="w-10 h-10 mx-auto text-slate-600" />
                    <div className="text-lg font-bold text-gray-800 mt-2">FINANCIAL REPORT</div>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">
                  {previewBody || 'Enter template body to see preview...'}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

// Quick Add Templates organized by page sections
const quickAddTemplates = [
  {
    category: 'Hero Section',
    icon: Zap,
    color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'Title', section: 'hero', key: 'title', type: 'text' as const, defaultContent: 'Your Page Title Here' },
      { name: 'Subtitle', section: 'hero', key: 'subtitle', type: 'text' as const, defaultContent: 'Supporting text that explains your value proposition' },
      { name: 'Description', section: 'hero', key: 'description', type: 'rich_text' as const, defaultContent: 'Detailed description text for the hero section.' },
      { name: 'Badge Text', section: 'hero', key: 'badge', type: 'json' as const, defaultContent: JSON.stringify({ text: 'New Feature', icon: 'sparkles' }, null, 2) },
      { name: 'Primary Button', section: 'hero', key: 'primary_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Get Started', href: '/register', variant: 'primary' }, null, 2) },
      { name: 'Secondary Button', section: 'hero', key: 'secondary_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Learn More', href: '#', variant: 'secondary' }, null, 2) },
      { name: 'Hero Image', section: 'hero', key: 'image', type: 'json' as const, defaultContent: JSON.stringify({ url: '/images/hero.jpg', alt: 'Hero image' }, null, 2) },
    ]
  },
  {
    category: 'Stats Section',
    icon: BarChart3,
    color: 'bg-emerald-100 text-emerald-700',
    items: [
      { name: 'Section Title', section: 'stats', key: 'title', type: 'text' as const, defaultContent: 'Our Numbers Speak' },
      { name: 'Stat 1', section: 'stats', key: 'stat_1', type: 'json' as const, defaultContent: JSON.stringify({ value: '99.99%', label: 'Gold Purity', icon: 'shield' }, null, 2) },
      { name: 'Stat 2', section: 'stats', key: 'stat_2', type: 'json' as const, defaultContent: JSON.stringify({ value: '2.5%', label: 'Monthly Bonus', icon: 'trending-up' }, null, 2) },
      { name: 'Stat 3', section: 'stats', key: 'stat_3', type: 'json' as const, defaultContent: JSON.stringify({ value: '$50M+', label: 'Gold in Custody', icon: 'coins' }, null, 2) },
      { name: 'Stat 4', section: 'stats', key: 'stat_4', type: 'json' as const, defaultContent: JSON.stringify({ value: '50,000+', label: 'Happy Investors', icon: 'users' }, null, 2) },
    ]
  },
  {
    category: 'Features Section',
    icon: List,
    color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Section Title', section: 'features', key: 'title', type: 'text' as const, defaultContent: 'Why Choose Us' },
      { name: 'Section Subtitle', section: 'features', key: 'subtitle', type: 'text' as const, defaultContent: 'Everything you need for gold investment' },
      { name: 'Feature 1', section: 'features', key: 'feature_1', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Secure Storage', description: 'Bank-grade security for your gold', icon: 'shield' }, null, 2) },
      { name: 'Feature 2', section: 'features', key: 'feature_2', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Instant Transfers', description: 'Send gold in seconds', icon: 'zap' }, null, 2) },
      { name: 'Feature 3', section: 'features', key: 'feature_3', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Monthly Bonuses', description: 'Earn rewards on your holdings', icon: 'gift' }, null, 2) },
      { name: 'Feature 4', section: 'features', key: 'feature_4', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Easy Withdrawals', description: 'Cash out anytime', icon: 'wallet' }, null, 2) },
    ]
  },
  {
    category: 'How It Works Section',
    icon: Hash,
    color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'Section Title', section: 'how_it_works', key: 'title', type: 'text' as const, defaultContent: 'How It Works' },
      { name: 'Section Subtitle', section: 'how_it_works', key: 'subtitle', type: 'text' as const, defaultContent: 'Get started in 4 simple steps' },
      { name: 'Step 1', section: 'how_it_works', key: 'step_1', type: 'json' as const, defaultContent: JSON.stringify({ number: 1, title: 'Create Account', description: 'Sign up in minutes', icon: 'user-plus' }, null, 2) },
      { name: 'Step 2', section: 'how_it_works', key: 'step_2', type: 'json' as const, defaultContent: JSON.stringify({ number: 2, title: 'Verify Identity', description: 'Complete KYC verification', icon: 'check-circle' }, null, 2) },
      { name: 'Step 3', section: 'how_it_works', key: 'step_3', type: 'json' as const, defaultContent: JSON.stringify({ number: 3, title: 'Buy Gold', description: 'Purchase at live prices', icon: 'shopping-cart' }, null, 2) },
      { name: 'Step 4', section: 'how_it_works', key: 'step_4', type: 'json' as const, defaultContent: JSON.stringify({ number: 4, title: 'Earn & Grow', description: 'Watch your gold grow', icon: 'trending-up' }, null, 2) },
    ]
  },
  {
    category: 'Pricing/Plans Section',
    icon: Tag,
    color: 'bg-rose-100 text-rose-700',
    items: [
      { name: 'Section Title', section: 'pricing', key: 'title', type: 'text' as const, defaultContent: 'Choose Your Plan' },
      { name: 'Section Subtitle', section: 'pricing', key: 'subtitle', type: 'text' as const, defaultContent: 'Find the perfect plan for your investment goals' },
      { name: 'Plan 1', section: 'pricing', key: 'plan_1', type: 'json' as const, defaultContent: JSON.stringify({ name: 'Starter', duration: '3 months', bonus: '1.0%', minInvestment: '$100', features: ['Basic support', 'Mobile access'] }, null, 2) },
      { name: 'Plan 2', section: 'pricing', key: 'plan_2', type: 'json' as const, defaultContent: JSON.stringify({ name: 'Growth', duration: '6 months', bonus: '1.5%', minInvestment: '$500', features: ['Priority support', 'Price alerts'], popular: false }, null, 2) },
      { name: 'Plan 3', section: 'pricing', key: 'plan_3', type: 'json' as const, defaultContent: JSON.stringify({ name: 'Premium', duration: '9 months', bonus: '2.0%', minInvestment: '$1,000', features: ['VIP support', 'Analytics', 'Early exit'], popular: true }, null, 2) },
      { name: 'Plan 4', section: 'pricing', key: 'plan_4', type: 'json' as const, defaultContent: JSON.stringify({ name: 'Elite', duration: '12 months', bonus: '2.5%', minInvestment: '$5,000', features: ['Dedicated manager', 'Full analytics', 'Exclusive benefits'] }, null, 2) },
    ]
  },
  {
    category: 'FAQ Section',
    icon: Type,
    color: 'bg-cyan-100 text-cyan-700',
    items: [
      { name: 'Section Title', section: 'faq', key: 'title', type: 'text' as const, defaultContent: 'Frequently Asked Questions' },
      { name: 'Section Subtitle', section: 'faq', key: 'subtitle', type: 'text' as const, defaultContent: 'Everything you need to know' },
      { name: 'FAQ 1', section: 'faq', key: 'faq_1', type: 'json' as const, defaultContent: JSON.stringify({ question: 'What is BNSL?', answer: 'BNSL (Buy Now Sell Later) lets you lock in gold prices today and sell when you choose.' }, null, 2) },
      { name: 'FAQ 2', section: 'faq', key: 'faq_2', type: 'json' as const, defaultContent: JSON.stringify({ question: 'How do I get started?', answer: 'Create an account, complete KYC, and start investing with as little as $100.' }, null, 2) },
      { name: 'FAQ 3', section: 'faq', key: 'faq_3', type: 'json' as const, defaultContent: JSON.stringify({ question: 'Is my gold insured?', answer: 'Yes, all gold is fully insured and stored in certified vaults.' }, null, 2) },
      { name: 'FAQ 4', section: 'faq', key: 'faq_4', type: 'json' as const, defaultContent: JSON.stringify({ question: 'How are bonuses paid?', answer: 'Bonuses are paid monthly in gold grams, credited to your account.' }, null, 2) },
    ]
  },
  {
    category: 'CTA Section',
    icon: MousePointer,
    color: 'bg-indigo-100 text-indigo-700',
    items: [
      { name: 'Title', section: 'cta', key: 'title', type: 'text' as const, defaultContent: 'Ready to Start Investing?' },
      { name: 'Subtitle', section: 'cta', key: 'subtitle', type: 'text' as const, defaultContent: 'Join thousands of investors securing their wealth with gold.' },
      { name: 'Primary Button', section: 'cta', key: 'primary_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Start Now', href: '/register', variant: 'primary' }, null, 2) },
      { name: 'Secondary Button', section: 'cta', key: 'secondary_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Contact Sales', href: '/contact', variant: 'outline' }, null, 2) },
    ]
  },
  {
    category: 'Footer Section',
    icon: Link2,
    color: 'bg-gray-100 text-gray-700',
    items: [
      { name: 'Company Name', section: 'footer', key: 'company_name', type: 'text' as const, defaultContent: 'Finatrades' },
      { name: 'Tagline', section: 'footer', key: 'tagline', type: 'text' as const, defaultContent: 'Gold-backed digital finance for everyone.' },
      { name: 'Copyright Text', section: 'footer', key: 'copyright', type: 'text' as const, defaultContent: '© 2024 Finatrades. All rights reserved.' },
      { name: 'Products Links', section: 'footer', key: 'products_links', type: 'json' as const, defaultContent: JSON.stringify([{ text: 'FinaVault', href: '/finavault' }, { text: 'FinaPay', href: '/finapay' }, { text: 'BNSL', href: '/bnsl-explore' }], null, 2) },
      { name: 'Legal Links', section: 'footer', key: 'legal_links', type: 'json' as const, defaultContent: JSON.stringify([{ text: 'Privacy Policy', href: '/privacy' }, { text: 'Terms of Service', href: '/terms' }], null, 2) },
      { name: 'Contact Info', section: 'footer', key: 'contact', type: 'json' as const, defaultContent: JSON.stringify({ email: 'support@finatrades.com', phone: '+971 4 XXX XXXX', address: 'Dubai, UAE' }, null, 2) },
    ]
  },
  {
    category: 'Navigation',
    icon: List,
    color: 'bg-violet-100 text-violet-700',
    items: [
      { name: 'Logo', section: 'navigation', key: 'logo', type: 'json' as const, defaultContent: JSON.stringify({ url: '/images/logo.svg', alt: 'Finatrades', width: 150 }, null, 2) },
      { name: 'Nav Item 1', section: 'navigation', key: 'nav_1', type: 'json' as const, defaultContent: JSON.stringify({ label: 'Products', href: '/products', icon: 'package' }, null, 2) },
      { name: 'Nav Item 2', section: 'navigation', key: 'nav_2', type: 'json' as const, defaultContent: JSON.stringify({ label: 'Pricing', href: '/pricing', icon: 'tag' }, null, 2) },
      { name: 'Nav Item 3', section: 'navigation', key: 'nav_3', type: 'json' as const, defaultContent: JSON.stringify({ label: 'About', href: '/about', icon: 'info' }, null, 2) },
      { name: 'Sign In Button', section: 'navigation', key: 'signin_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Sign In', href: '/login', variant: 'outline' }, null, 2) },
      { name: 'Get Started Button', section: 'navigation', key: 'cta_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Get Started', href: '/register', variant: 'primary' }, null, 2) },
    ]
  },
  // ==================== PRIVATE PAGES (Login Required) ====================
  {
    category: 'Dashboard (Private)',
    icon: LayoutDashboard,
    color: 'bg-slate-100 text-slate-700',
    items: [
      { name: 'Welcome Title', section: 'dashboard', key: 'welcome_title', type: 'text' as const, defaultContent: 'Dashboard Overview' },
      { name: 'Welcome Subtitle', section: 'dashboard', key: 'welcome_subtitle', type: 'text' as const, defaultContent: 'Welcome back to your financial command center.' },
      { name: 'KPI Card 1', section: 'dashboard', key: 'kpi_1', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Gold Storage', value: '0.000 kg', icon: 'database' }, null, 2) },
      { name: 'KPI Card 2', section: 'dashboard', key: 'kpi_2', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Gold Value (USD)', value: '$0.00', icon: 'dollar-sign' }, null, 2) },
      { name: 'KPI Card 3', section: 'dashboard', key: 'kpi_3', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Total Portfolio', value: '$0.00', icon: 'coins' }, null, 2) },
      { name: 'Quick Action', section: 'dashboard', key: 'quick_action', type: 'json' as const, defaultContent: JSON.stringify({ label: 'Buy Gold', href: '/finapay', icon: 'plus' }, null, 2) },
    ]
  },
  {
    category: 'FinaPay Wallet (Private)',
    icon: Wallet,
    color: 'bg-green-100 text-green-700',
    items: [
      { name: 'Page Title', section: 'finapay', key: 'title', type: 'text' as const, defaultContent: 'FinaPay Wallet' },
      { name: 'Page Subtitle', section: 'finapay', key: 'subtitle', type: 'text' as const, defaultContent: 'Buy, sell, and send gold instantly.' },
      { name: 'Balance Label', section: 'finapay', key: 'balance_label', type: 'text' as const, defaultContent: 'Your Gold Balance' },
      { name: 'Buy Button', section: 'finapay', key: 'buy_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Buy Gold', icon: 'plus', variant: 'primary' }, null, 2) },
      { name: 'Sell Button', section: 'finapay', key: 'sell_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Sell Gold', icon: 'minus', variant: 'secondary' }, null, 2) },
      { name: 'Send Button', section: 'finapay', key: 'send_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Send Gold', icon: 'send', variant: 'outline' }, null, 2) },
    ]
  },
  {
    category: 'FinaVault (Private)',
    icon: Database,
    color: 'bg-amber-100 text-amber-700',
    items: [
      { name: 'Page Title', section: 'finavault', key: 'title', type: 'text' as const, defaultContent: 'FinaVault' },
      { name: 'Page Subtitle', section: 'finavault', key: 'subtitle', type: 'text' as const, defaultContent: 'Secure physical gold storage with dual certificates.' },
      { name: 'Vault Location', section: 'finavault', key: 'vault_location', type: 'text' as const, defaultContent: 'Dubai DMCC Vault - Wingold & Metals' },
      { name: 'Storage Info', section: 'finavault', key: 'storage_info', type: 'json' as const, defaultContent: JSON.stringify({ label: 'Annual Storage Fee', value: '1.50%' }, null, 2) },
      { name: 'Certificate Info', section: 'finavault', key: 'certificate_info', type: 'json' as const, defaultContent: JSON.stringify({ digital: 'Finatrades Certificate', physical: 'Wingold & Metals DMCC Certificate' }, null, 2) },
      { name: 'Deposit Button', section: 'finavault', key: 'deposit_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'New Deposit', icon: 'plus', variant: 'primary' }, null, 2) },
    ]
  },
  {
    category: 'BNSL Plans (Private)',
    icon: TrendingUp,
    color: 'bg-purple-100 text-purple-700',
    items: [
      { name: 'Page Title', section: 'bnsl_dashboard', key: 'title', type: 'text' as const, defaultContent: 'BNSL Plans' },
      { name: 'Page Subtitle', section: 'bnsl_dashboard', key: 'subtitle', type: 'text' as const, defaultContent: 'Buy Now Sell Later - Lock prices, earn bonuses.' },
      { name: 'Active Plans Label', section: 'bnsl_dashboard', key: 'active_label', type: 'text' as const, defaultContent: 'Active Plans' },
      { name: 'Create Plan Button', section: 'bnsl_dashboard', key: 'create_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Create New Plan', icon: 'plus', variant: 'primary' }, null, 2) },
      { name: 'Plan Card', section: 'bnsl_dashboard', key: 'plan_card', type: 'json' as const, defaultContent: JSON.stringify({ duration: '6 months', bonus: '1.5%', minAmount: '$500' }, null, 2) },
    ]
  },
  {
    category: 'FinaBridge (Private)',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-700',
    items: [
      { name: 'Page Title', section: 'finabridge', key: 'title', type: 'text' as const, defaultContent: 'FinaBridge' },
      { name: 'Page Subtitle', section: 'finabridge', key: 'subtitle', type: 'text' as const, defaultContent: 'Trade finance solutions for importers and exporters.' },
      { name: 'Business Only Notice', section: 'finabridge', key: 'business_notice', type: 'text' as const, defaultContent: 'Available for Business accounts only.' },
      { name: 'Apply Button', section: 'finabridge', key: 'apply_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Apply for Trade Finance', icon: 'file-text', variant: 'primary' }, null, 2) },
      { name: 'Case Status', section: 'finabridge', key: 'case_status', type: 'json' as const, defaultContent: JSON.stringify({ submitted: 'Submitted', underReview: 'Under Review', approved: 'Approved', rejected: 'Rejected' }, null, 2) },
    ]
  },
  {
    category: 'FinaCard (Private)',
    icon: CreditCard,
    color: 'bg-zinc-100 text-zinc-700',
    items: [
      { name: 'Page Title', section: 'finacard', key: 'title', type: 'text' as const, defaultContent: 'FinaCard Metal' },
      { name: 'Page Subtitle', section: 'finacard', key: 'subtitle', type: 'text' as const, defaultContent: 'Spend your gold anywhere in the world.' },
      { name: 'Coming Soon Badge', section: 'finacard', key: 'coming_soon', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Coming Soon to Your Region', icon: 'sparkles' }, null, 2) },
      { name: 'Feature 1', section: 'finacard', key: 'feature_1', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Global Acceptance', description: 'Accepted worldwide', icon: 'globe' }, null, 2) },
      { name: 'Feature 2', section: 'finacard', key: 'feature_2', type: 'json' as const, defaultContent: JSON.stringify({ title: 'Real-time Conversion', description: 'Gold to fiat at POS', icon: 'zap' }, null, 2) },
      { name: 'Waitlist Button', section: 'finacard', key: 'waitlist_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Join Waitlist', icon: 'bell', variant: 'primary' }, null, 2) },
    ]
  },
  {
    category: 'Profile (Private)',
    icon: User,
    color: 'bg-orange-100 text-orange-700',
    items: [
      { name: 'Page Title', section: 'profile', key: 'title', type: 'text' as const, defaultContent: 'My Profile' },
      { name: 'Page Subtitle', section: 'profile', key: 'subtitle', type: 'text' as const, defaultContent: 'Manage your account settings and preferences.' },
      { name: 'Personal Info Label', section: 'profile', key: 'personal_label', type: 'text' as const, defaultContent: 'Personal Information' },
      { name: 'KYC Status Label', section: 'profile', key: 'kyc_label', type: 'text' as const, defaultContent: 'KYC Verification Status' },
      { name: 'Edit Button', section: 'profile', key: 'edit_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Edit Profile', icon: 'edit', variant: 'outline' }, null, 2) },
      { name: 'Save Button', section: 'profile', key: 'save_button', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Save Changes', icon: 'save', variant: 'primary' }, null, 2) },
    ]
  },
  {
    category: 'Settings (Private)',
    icon: Settings,
    color: 'bg-gray-100 text-gray-700',
    items: [
      { name: 'Page Title', section: 'settings', key: 'title', type: 'text' as const, defaultContent: 'Settings' },
      { name: 'Page Subtitle', section: 'settings', key: 'subtitle', type: 'text' as const, defaultContent: 'Manage your account preferences and security.' },
      { name: 'Security Section', section: 'settings', key: 'security_title', type: 'text' as const, defaultContent: 'Security Settings' },
      { name: 'Notifications Section', section: 'settings', key: 'notifications_title', type: 'text' as const, defaultContent: 'Notification Preferences' },
      { name: 'Change Password', section: 'settings', key: 'change_password', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Change Password', icon: 'key', variant: 'outline' }, null, 2) },
      { name: 'Enable 2FA', section: 'settings', key: 'enable_2fa', type: 'json' as const, defaultContent: JSON.stringify({ text: 'Enable Two-Factor Auth', icon: 'shield', variant: 'primary' }, null, 2) },
    ]
  },
];

function QuickAddTemplates({ 
  pages, 
  existingBlocks,
  onAddBlock, 
  isPending 
}: { 
  pages: ContentPage[]; 
  existingBlocks: ContentBlock[];
  onAddBlock: (data: Partial<ContentBlock>) => void;
  isPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('_global');
  const [customSection, setCustomSection] = useState('');
  const [customKey, setCustomKey] = useState('');
  const { toast } = useToast();

  const checkBlockExists = (pageId: string | null, section: string, key: string) => {
    return existingBlocks.some(block => 
      block.pageId === pageId && 
      block.section === section && 
      block.key === key
    );
  };

  const handleQuickAdd = (template: typeof quickAddTemplates[0]['items'][0]) => {
    const section = customSection || template.section;
    const key = customKey || template.key;
    const pageId = selectedPage === '_global' ? null : selectedPage;
    
    // Check if block already exists
    if (checkBlockExists(pageId, section, key)) {
      toast({
        title: "Block already exists",
        description: `A block with section "${section}" and key "${key}" already exists.`,
        variant: "destructive"
      });
      return;
    }
    
    onAddBlock({
      pageId,
      section,
      key,
      type: template.type,
      defaultContent: template.defaultContent,
      status: 'draft'
    });
    
    setCustomSection('');
    setCustomKey('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Quick Add Content Blocks</CardTitle>
                  <CardDescription>Pre-configured templates for buttons, stats, text, badges, links & more</CardDescription>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Page & Custom Overrides */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Target Page (Optional)</Label>
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger className="h-9" data-testid="select-quick-add-page">
                    <SelectValue placeholder="Select page..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_global">No page (global)</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Custom Section (Override)</Label>
                <Input 
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value)}
                  placeholder="e.g., hero, features"
                  className="h-9"
                  data-testid="input-quick-section"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Custom Key (Override)</Label>
                <Input 
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="e.g., title, cta_button"
                  className="h-9"
                  data-testid="input-quick-key"
                />
              </div>
            </div>

            {/* Template Categories */}
            <div className="grid gap-4">
              {quickAddTemplates.map((category) => (
                <div key={category.category} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded ${category.color}`}>
                      <category.icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-medium text-sm">{category.category}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.items.map((item) => (
                      <Button
                        key={item.key}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdd(item)}
                        disabled={isPending}
                        className="h-8 text-xs"
                        data-testid={`button-quick-add-${item.key}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function BrandingTab({
  settings,
  isLoading,
  onSave,
  isPending
}: {
  settings: any;
  isLoading: boolean;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    companyName: '',
    tagline: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#f97316',
    primaryForeground: '#ffffff',
    secondaryColor: '#eab308',
    secondaryForeground: '#ffffff',
    accentColor: '#f59e0b',
    buttonRadius: '0.5rem',
    buttonPrimaryBg: '#f97316',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryBg: '#f3f4f6',
    buttonSecondaryText: '#1f2937',
    fontFamily: 'Inter',
    headingFontFamily: '',
    backgroundColor: '#ffffff',
    cardBackground: '#ffffff',
    sidebarBackground: '#1f2937',
    borderRadius: '0.5rem',
    borderColor: '#e5e7eb',
    footerText: '',
    twitterUrl: '',
    linkedinUrl: '',
    facebookUrl: '',
    instagramUrl: ''
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || 'Finatrades',
        tagline: settings.tagline || '',
        logoUrl: settings.logoUrl || '',
        faviconUrl: settings.faviconUrl || '',
        primaryColor: settings.primaryColor || '#f97316',
        primaryForeground: settings.primaryForeground || '#ffffff',
        secondaryColor: settings.secondaryColor || '#eab308',
        secondaryForeground: settings.secondaryForeground || '#ffffff',
        accentColor: settings.accentColor || '#f59e0b',
        buttonRadius: settings.buttonRadius || '0.5rem',
        buttonPrimaryBg: settings.buttonPrimaryBg || '#f97316',
        buttonPrimaryText: settings.buttonPrimaryText || '#ffffff',
        buttonSecondaryBg: settings.buttonSecondaryBg || '#f3f4f6',
        buttonSecondaryText: settings.buttonSecondaryText || '#1f2937',
        fontFamily: settings.fontFamily || 'Inter',
        headingFontFamily: settings.headingFontFamily || '',
        backgroundColor: settings.backgroundColor || '#ffffff',
        cardBackground: settings.cardBackground || '#ffffff',
        sidebarBackground: settings.sidebarBackground || '#1f2937',
        borderRadius: settings.borderRadius || '0.5rem',
        borderColor: settings.borderColor || '#e5e7eb',
        footerText: settings.footerText || '',
        twitterUrl: settings.socialLinks?.twitter || '',
        linkedinUrl: settings.socialLinks?.linkedin || '',
        facebookUrl: settings.socialLinks?.facebook || '',
        instagramUrl: settings.socialLinks?.instagram || ''
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      socialLinks: {
        twitter: formData.twitterUrl || null,
        linkedin: formData.linkedinUrl || null,
        facebook: formData.facebookUrl || null,
        instagram: formData.instagramUrl || null
      }
    };
    delete (dataToSave as any).twitterUrl;
    delete (dataToSave as any).linkedinUrl;
    delete (dataToSave as any).facebookUrl;
    delete (dataToSave as any).instagramUrl;
    onSave(dataToSave);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const ColorInput = ({ label, field, value }: { label: string; field: string; value: string }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Label className="text-sm text-gray-600">{label}</Label>
        <div className="flex gap-2 mt-1">
          <input
            type="color"
            value={value}
            onChange={(e) => updateField(field, e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-gray-200"
            data-testid={`input-color-${field}`}
          />
          <Input
            value={value}
            onChange={(e) => updateField(field, e.target.value)}
            placeholder="#000000"
            className="flex-1"
            data-testid={`input-text-${field}`}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading branding settings...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="w-5 h-5" />
              Company Identity
            </CardTitle>
            <CardDescription>Basic company branding information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="Your Company Name"
                data-testid="input-company-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Your company tagline"
                data-testid="input-tagline"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                data-testid="input-logo-url"
              />
              {formData.logoUrl && (
                <div className="mt-2 p-4 bg-gray-100 rounded flex items-center justify-center">
                  <img src={formData.logoUrl} alt="Logo preview" className="max-h-16 max-w-full" />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input
                id="faviconUrl"
                value={formData.faviconUrl}
                onChange={(e) => updateField('faviconUrl', e.target.value)}
                placeholder="https://example.com/favicon.ico"
                data-testid="input-favicon-url"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>Primary theme colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Primary Color" field="primaryColor" value={formData.primaryColor} />
              <ColorInput label="Primary Text" field="primaryForeground" value={formData.primaryForeground} />
              <ColorInput label="Secondary Color" field="secondaryColor" value={formData.secondaryColor} />
              <ColorInput label="Secondary Text" field="secondaryForeground" value={formData.secondaryForeground} />
              <ColorInput label="Accent Color" field="accentColor" value={formData.accentColor} />
              <ColorInput label="Border Color" field="borderColor" value={formData.borderColor} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Button Styling
            </CardTitle>
            <CardDescription>Customize button appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Primary Button Bg" field="buttonPrimaryBg" value={formData.buttonPrimaryBg} />
              <ColorInput label="Primary Button Text" field="buttonPrimaryText" value={formData.buttonPrimaryText} />
              <ColorInput label="Secondary Button Bg" field="buttonSecondaryBg" value={formData.buttonSecondaryBg} />
              <ColorInput label="Secondary Button Text" field="buttonSecondaryText" value={formData.buttonSecondaryText} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="buttonRadius">Button Border Radius</Label>
              <Select value={formData.buttonRadius} onValueChange={(v) => updateField('buttonRadius', v)}>
                <SelectTrigger data-testid="select-button-radius">
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Square (0)</SelectItem>
                  <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                  <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                  <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                  <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                  <SelectItem value="9999px">Pill (Full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-3">Preview</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  style={{
                    backgroundColor: formData.buttonPrimaryBg,
                    color: formData.buttonPrimaryText,
                    borderRadius: formData.buttonRadius,
                    padding: '0.5rem 1rem',
                    border: 'none',
                    fontWeight: 500
                  }}
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: formData.buttonSecondaryBg,
                    color: formData.buttonSecondaryText,
                    borderRadius: formData.buttonRadius,
                    padding: '0.5rem 1rem',
                    border: `1px solid ${formData.borderColor}`,
                    fontWeight: 500
                  }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Layout & Typography
            </CardTitle>
            <CardDescription>Fonts and background colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="fontFamily">Body Font</Label>
              <Select value={formData.fontFamily} onValueChange={(v) => updateField('fontFamily', v)}>
                <SelectTrigger data-testid="select-font-family">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="headingFontFamily">Heading Font (Optional)</Label>
              <Select value={formData.headingFontFamily || 'same'} onValueChange={(v) => updateField('headingFontFamily', v === 'same' ? '' : v)}>
                <SelectTrigger data-testid="select-heading-font">
                  <SelectValue placeholder="Same as body" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">Same as body</SelectItem>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Background" field="backgroundColor" value={formData.backgroundColor} />
              <ColorInput label="Card Background" field="cardBackground" value={formData.cardBackground} />
              <ColorInput label="Sidebar Background" field="sidebarBackground" value={formData.sidebarBackground} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Select value={formData.borderRadius} onValueChange={(v) => updateField('borderRadius', v)}>
                <SelectTrigger data-testid="select-border-radius">
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Square (0)</SelectItem>
                  <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                  <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                  <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                  <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Footer & Social Links
            </CardTitle>
            <CardDescription>Footer text and social media links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="footerText">Footer Text</Label>
              <Textarea
                id="footerText"
                value={formData.footerText}
                onChange={(e) => updateField('footerText', e.target.value)}
                placeholder="© 2025 Your Company. All rights reserved."
                rows={2}
                data-testid="input-footer-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="twitterUrl">Twitter/X URL</Label>
                <Input
                  id="twitterUrl"
                  value={formData.twitterUrl}
                  onChange={(e) => updateField('twitterUrl', e.target.value)}
                  placeholder="https://twitter.com/yourcompany"
                  data-testid="input-twitter-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateField('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                  data-testid="input-linkedin-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  value={formData.facebookUrl}
                  onChange={(e) => updateField('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/yourcompany"
                  data-testid="input-facebook-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  value={formData.instagramUrl}
                  onChange={(e) => updateField('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/yourcompany"
                  data-testid="input-instagram-url"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={isPending} size="lg" data-testid="button-save-branding">
          <Save className="w-4 h-4 mr-2" />
          {isPending ? 'Saving...' : 'Save Branding Settings'}
        </Button>
      </div>
    </form>
  );
}
