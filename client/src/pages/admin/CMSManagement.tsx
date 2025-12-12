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
  ChevronDown
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
          <TabsList className="grid w-full grid-cols-3 max-w-md">
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
  const [type, setType] = useState<'email' | 'certificate' | 'notification' | 'page_section'>(template?.type || 'email');
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

// Quick Add Templates for common content types
const quickAddTemplates = [
  {
    category: 'Buttons & CTAs',
    icon: MousePointer,
    color: 'bg-purple-100 text-purple-700',
    items: [
      { 
        name: 'Primary Button', 
        section: 'cta', 
        key: 'primary_button', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Get Started', href: '/register', variant: 'primary' }, null, 2)
      },
      { 
        name: 'Secondary Button', 
        section: 'cta', 
        key: 'secondary_button', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Learn More', href: '#', variant: 'secondary' }, null, 2)
      },
      { 
        name: 'Link Button', 
        section: 'cta', 
        key: 'link_button', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'View Details', href: '#', variant: 'link' }, null, 2)
      },
    ]
  },
  {
    category: 'Stats & Numbers',
    icon: BarChart3,
    color: 'bg-emerald-100 text-emerald-700',
    items: [
      { 
        name: 'Stat with Label', 
        section: 'stats', 
        key: 'stat_item', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ value: '99.99%', label: 'Gold Purity', icon: 'shield' }, null, 2)
      },
      { 
        name: 'Percentage Display', 
        section: 'stats', 
        key: 'percentage', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ value: '2.5%', label: 'Monthly Bonus', prefix: '+' }, null, 2)
      },
      { 
        name: 'Currency Amount', 
        section: 'stats', 
        key: 'currency', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ value: '50M', label: 'Gold in Custody', prefix: '$', suffix: '+' }, null, 2)
      },
    ]
  },
  {
    category: 'Text Elements',
    icon: Type,
    color: 'bg-blue-100 text-blue-700',
    items: [
      { 
        name: 'Page Title', 
        section: 'hero', 
        key: 'title', 
        type: 'text' as const,
        defaultContent: 'Your Page Title Here'
      },
      { 
        name: 'Subtitle', 
        section: 'hero', 
        key: 'subtitle', 
        type: 'text' as const,
        defaultContent: 'Supporting text that explains your value proposition'
      },
      { 
        name: 'Section Heading', 
        section: 'section', 
        key: 'heading', 
        type: 'text' as const,
        defaultContent: 'Section Heading'
      },
      { 
        name: 'Body Text', 
        section: 'content', 
        key: 'body', 
        type: 'rich_text' as const,
        defaultContent: 'Enter your content here. This field supports multi-line text.'
      },
    ]
  },
  {
    category: 'Badges & Labels',
    icon: Tag,
    color: 'bg-amber-100 text-amber-700',
    items: [
      { 
        name: 'Feature Badge', 
        section: 'badges', 
        key: 'feature_badge', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'New Feature', variant: 'success', icon: 'sparkles' }, null, 2)
      },
      { 
        name: 'Popular Tag', 
        section: 'badges', 
        key: 'popular_tag', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Most Popular', variant: 'gold' }, null, 2)
      },
      { 
        name: 'Status Label', 
        section: 'badges', 
        key: 'status', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Live', variant: 'success', pulse: true }, null, 2)
      },
    ]
  },
  {
    category: 'Links & Navigation',
    icon: Link2,
    color: 'bg-cyan-100 text-cyan-700',
    items: [
      { 
        name: 'Text Link', 
        section: 'links', 
        key: 'text_link', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Learn more', href: '#', external: false }, null, 2)
      },
      { 
        name: 'Footer Link', 
        section: 'footer', 
        key: 'footer_link', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ text: 'Privacy Policy', href: '/privacy' }, null, 2)
      },
      { 
        name: 'Nav Item', 
        section: 'navigation', 
        key: 'nav_item', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ label: 'Products', href: '/products', icon: 'package' }, null, 2)
      },
    ]
  },
  {
    category: 'Lists & Features',
    icon: List,
    color: 'bg-rose-100 text-rose-700',
    items: [
      { 
        name: 'Feature List', 
        section: 'features', 
        key: 'feature_list', 
        type: 'json' as const,
        defaultContent: JSON.stringify([
          { title: 'Feature 1', description: 'Description of feature 1' },
          { title: 'Feature 2', description: 'Description of feature 2' },
          { title: 'Feature 3', description: 'Description of feature 3' }
        ], null, 2)
      },
      { 
        name: 'Benefit Points', 
        section: 'benefits', 
        key: 'benefit_points', 
        type: 'json' as const,
        defaultContent: JSON.stringify([
          'Benefit point 1',
          'Benefit point 2',
          'Benefit point 3',
          'Benefit point 4'
        ], null, 2)
      },
      { 
        name: 'Plan Features', 
        section: 'pricing', 
        key: 'plan_features', 
        type: 'json' as const,
        defaultContent: JSON.stringify([
          { feature: 'Unlimited access', included: true },
          { feature: 'Priority support', included: true },
          { feature: 'Custom branding', included: false }
        ], null, 2)
      },
    ]
  },
  {
    category: 'Images & Media',
    icon: Image,
    color: 'bg-indigo-100 text-indigo-700',
    items: [
      { 
        name: 'Hero Image', 
        section: 'hero', 
        key: 'hero_image', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ url: '/images/hero.jpg', alt: 'Hero image description', width: 1200, height: 600 }, null, 2)
      },
      { 
        name: 'Logo', 
        section: 'branding', 
        key: 'logo', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ url: '/images/logo.svg', alt: 'Company logo', width: 150, height: 40 }, null, 2)
      },
      { 
        name: 'Icon', 
        section: 'icons', 
        key: 'icon', 
        type: 'json' as const,
        defaultContent: JSON.stringify({ name: 'shield', color: 'amber', size: 24 }, null, 2)
      },
    ]
  },
];

function QuickAddTemplates({ 
  pages, 
  onAddBlock, 
  isPending 
}: { 
  pages: ContentPage[]; 
  onAddBlock: (data: Partial<ContentBlock>) => void;
  isPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [customSection, setCustomSection] = useState('');
  const [customKey, setCustomKey] = useState('');

  const handleQuickAdd = (template: typeof quickAddTemplates[0]['items'][0]) => {
    const section = customSection || template.section;
    const key = customKey || template.key;
    
    onAddBlock({
      pageId: selectedPage || null,
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
                    <SelectItem value="">No page (global)</SelectItem>
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
