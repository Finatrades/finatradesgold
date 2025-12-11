import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, Mail, Eye, Save, X, 
  Copy, FileText, Shield, CreditCard, Users, 
  Bell, Gift, Settings
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'Onboarding' | 'Transaction' | 'KYC' | 'BNSL' | 'Security' | 'Support' | 'Referral' | 'System';
  subject: string;
  subjectFr: string | null;
  body: string;
  bodyFr: string | null;
  placeholders: string[];
  isActive: boolean;
  lastEditedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'Onboarding', label: 'Onboarding', icon: Users },
  { value: 'Transaction', label: 'Transactions', icon: CreditCard },
  { value: 'KYC', label: 'KYC', icon: Shield },
  { value: 'BNSL', label: 'BNSL', icon: FileText },
  { value: 'Security', label: 'Security', icon: Shield },
  { value: 'Support', label: 'Support', icon: Bell },
  { value: 'Referral', label: 'Referral', icon: Gift },
  { value: 'System', label: 'System', icon: Settings },
];

const PLACEHOLDERS = {
  user: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{finatradesId}}'],
  transaction: ['{{amount}}', '{{currency}}', '{{transactionId}}', '{{date}}', '{{type}}'],
  kyc: ['{{kycStatus}}', '{{rejectionReason}}'],
  bnsl: ['{{planName}}', '{{goldGrams}}', '{{maturityDate}}', '{{payoutAmount}}'],
  security: ['{{resetLink}}', '{{verificationCode}}', '{{ipAddress}}'],
  referral: ['{{referralCode}}', '{{bonusAmount}}', '{{referredName}}'],
};

const DEFAULT_TEMPLATES = [
  { name: 'welcome_personal', category: 'Onboarding', subject: 'Welcome to Finatrades, {{firstName}}!', body: 'Dear {{firstName}},\n\nWelcome to Finatrades! Your account has been created successfully.\n\nYour Finatrades ID: {{finatradesId}}\n\nGet started by completing your KYC verification to unlock all features.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'welcome_business', category: 'Onboarding', subject: 'Welcome to Finatrades Business', body: 'Dear {{firstName}},\n\nWelcome to Finatrades Business! Your corporate account has been created.\n\nComplete your business KYC to access trade finance and corporate features.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'kyc_approved', category: 'KYC', subject: 'KYC Verification Approved', body: 'Dear {{firstName}},\n\nGreat news! Your KYC verification has been approved.\n\nYou now have full access to all Finatrades features including:\n- Gold trading\n- BNSL plans\n- Trade finance (for business accounts)\n\nStart exploring today!\n\nBest regards,\nThe Finatrades Team' },
  { name: 'kyc_rejected', category: 'KYC', subject: 'KYC Verification Update Required', body: 'Dear {{firstName}},\n\nWe were unable to approve your KYC verification.\n\nReason: {{rejectionReason}}\n\nPlease update your documents and resubmit for review.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'transaction_buy', category: 'Transaction', subject: 'Gold Purchase Confirmation - {{transactionId}}', body: 'Dear {{firstName}},\n\nYour gold purchase has been completed.\n\nTransaction ID: {{transactionId}}\nAmount: {{amount}} {{currency}}\nDate: {{date}}\n\nView your updated balance in your FinaPay wallet.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'transaction_sell', category: 'Transaction', subject: 'Gold Sale Confirmation - {{transactionId}}', body: 'Dear {{firstName}},\n\nYour gold sale has been completed.\n\nTransaction ID: {{transactionId}}\nAmount: {{amount}} {{currency}}\nDate: {{date}}\n\nFunds have been credited to your wallet.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'bnsl_activation', category: 'BNSL', subject: 'BNSL Plan Activated', body: 'Dear {{firstName}},\n\nYour BNSL plan has been activated!\n\nPlan: {{planName}}\nGold Amount: {{goldGrams}}g\nMaturity Date: {{maturityDate}}\n\nTrack your plan progress in your dashboard.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'bnsl_payout', category: 'BNSL', subject: 'BNSL Payout Processed', body: 'Dear {{firstName}},\n\nYour BNSL payout has been processed.\n\nPlan: {{planName}}\nPayout Amount: {{payoutAmount}}\n\nThe funds have been credited to your wallet.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'password_reset', category: 'Security', subject: 'Password Reset Request', body: 'Dear {{firstName}},\n\nWe received a request to reset your password.\n\nClick the link below to reset your password:\n{{resetLink}}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'login_alert', category: 'Security', subject: 'New Login Detected', body: 'Dear {{firstName}},\n\nA new login was detected on your account.\n\nIP Address: {{ipAddress}}\nDate: {{date}}\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nThe Finatrades Team' },
  { name: 'referral_signup', category: 'Referral', subject: 'Your Referral Signed Up!', body: 'Dear {{firstName}},\n\nGreat news! {{referredName}} has signed up using your referral code.\n\nYour bonus of {{bonusAmount}} will be credited once they complete their first transaction.\n\nKeep sharing your referral code: {{referralCode}}\n\nBest regards,\nThe Finatrades Team' },
];

export default function EmailTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Onboarding' as EmailTemplate['category'],
    subject: '',
    subjectFr: '',
    body: '',
    bodyFr: '',
    placeholders: [] as string[],
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/email-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const templates: EmailTemplate[] = data?.templates || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Email template created successfully');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Email template updated');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Email template deleted');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const template of DEFAULT_TEMPLATES) {
        await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...template,
            placeholders: extractPlaceholders(template.body),
            isActive: true,
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success('Default templates created');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: () => {
      toast.error('Failed to create default templates');
    },
  });

  const extractPlaceholders = (text: string): string[] => {
    const matches = text.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'Onboarding',
      subject: '',
      subjectFr: '',
      body: '',
      bodyFr: '',
      placeholders: [],
      isActive: true,
    });
    setShowDialog(true);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      subjectFr: template.subjectFr || '',
      body: template.body,
      bodyFr: template.bodyFr || '',
      placeholders: template.placeholders || [],
      isActive: template.isActive,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    const placeholders = extractPlaceholders(formData.body + ' ' + formData.subject);
    const dataWithPlaceholders = { ...formData, placeholders };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: dataWithPlaceholders });
    } else {
      createMutation.mutate(dataWithPlaceholders);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + placeholder,
    }));
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : Mail;
  };

  const previewContent = (template: typeof formData) => {
    let preview = template.body
      .replace(/\{\{firstName\}\}/g, 'John')
      .replace(/\{\{lastName\}\}/g, 'Doe')
      .replace(/\{\{email\}\}/g, 'john@example.com')
      .replace(/\{\{finatradesId\}\}/g, 'FIN-ABC123')
      .replace(/\{\{amount\}\}/g, '100.00')
      .replace(/\{\{currency\}\}/g, 'USD')
      .replace(/\{\{transactionId\}\}/g, 'TX-123456')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{kycStatus\}\}/g, 'Approved')
      .replace(/\{\{rejectionReason\}\}/g, 'Document unclear')
      .replace(/\{\{planName\}\}/g, '12-Month Gold Plan')
      .replace(/\{\{goldGrams\}\}/g, '50')
      .replace(/\{\{maturityDate\}\}/g, '2026-01-01')
      .replace(/\{\{payoutAmount\}\}/g, '$5,000')
      .replace(/\{\{resetLink\}\}/g, 'https://finatrades.com/reset/abc123')
      .replace(/\{\{verificationCode\}\}/g, '123456')
      .replace(/\{\{ipAddress\}\}/g, '192.168.1.1')
      .replace(/\{\{referralCode\}\}/g, 'REF-XYZ789')
      .replace(/\{\{bonusAmount\}\}/g, '0.5g Gold')
      .replace(/\{\{referredName\}\}/g, 'Jane Smith');
    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Email Templates</h1>
          <p className="text-muted-foreground">Manage email templates for all platform notifications</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button 
              variant="outline" 
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-templates"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Default Templates
            </Button>
          )}
          <Button onClick={openNewDialog} data-testid="button-add-template">
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          data-testid="filter-all"
        >
          All ({templates.length})
        </Button>
        {CATEGORIES.map(cat => {
          const count = templates.filter(t => t.category === cat.value).length;
          const Icon = cat.icon;
          return (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              data-testid={`filter-${cat.value.toLowerCase()}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Email Templates</h3>
            <p className="text-muted-foreground mb-4">
              {templates.length === 0 
                ? 'Create default templates to get started' 
                : 'No templates in this category'}
            </p>
            {templates.length === 0 && (
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                Create Default Templates
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map(template => {
            const Icon = getCategoryIcon(template.category);
            return (
              <Card key={template.id} data-testid={`card-template-${template.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${template.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant={template.isActive ? 'default' : 'secondary'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.body.substring(0, 150)}...</p>
                        {template.placeholders && template.placeholders.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {template.placeholders.slice(0, 5).map(p => (
                              <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                            {template.placeholders.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{template.placeholders.length - 5} more</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setFormData({
                            name: template.name,
                            category: template.category,
                            subject: template.subject,
                            subjectFr: template.subjectFr || '',
                            body: template.body,
                            bodyFr: template.bodyFr || '',
                            placeholders: template.placeholders || [],
                            isActive: template.isActive,
                          });
                          setShowPreview(true);
                        }}
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(template.id)}
                        data-testid={`button-delete-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Email Template' : 'Create Email Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the email template content' : 'Create a new email template for platform notifications'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="english" className="w-full">
            <TabsList>
              <TabsTrigger value="english">English</TabsTrigger>
              <TabsTrigger value="french">French</TabsTrigger>
            </TabsList>

            <TabsContent value="english" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., welcome_email"
                    data-testid="input-template-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: EmailTemplate['category']) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject Line *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject line"
                  data-testid="input-subject"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email Body *</Label>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(PLACEHOLDERS).slice(0, 2).map(([key, values]) => (
                      <div key={key} className="flex gap-1">
                        {values.slice(0, 2).map(p => (
                          <Button 
                            key={p} 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => insertPlaceholder(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Email body content..."
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="textarea-body"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-active"
                />
                <Label>Template Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="french" className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line (French)</Label>
                <Input
                  value={formData.subjectFr}
                  onChange={(e) => setFormData(prev => ({ ...prev, subjectFr: e.target.value }))}
                  placeholder="Ligne d'objet de l'e-mail"
                  data-testid="input-subject-fr"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body (French)</Label>
                <Textarea
                  value={formData.bodyFr}
                  onChange={(e) => setFormData(prev => ({ ...prev, bodyFr: e.target.value }))}
                  placeholder="Contenu du corps de l'e-mail..."
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="textarea-body-fr"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Preview with sample data</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div className="border-b pb-2 mb-4">
              <p className="text-sm text-muted-foreground">Subject:</p>
              <p className="font-medium">{previewContent({ ...formData, body: formData.subject })}</p>
            </div>
            <div className="whitespace-pre-wrap text-sm">
              {previewContent(formData)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
