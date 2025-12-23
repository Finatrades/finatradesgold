import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileWarning, Clock, AlertTriangle, Send, Calendar, User, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface ExpiringDocument {
  id: string;
  userId: string;
  documentType: string;
  expiresAt: string;
  daysUntilExpiry: number;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    finatradesId: string | null;
  };
}

interface ExpiryStats {
  expiredCount: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
}

export default function DocumentExpiryAdmin() {
  const [documents, setDocuments] = useState<ExpiringDocument[]>([]);
  const [stats, setStats] = useState<ExpiryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [daysAhead, setDaysAhead] = useState('30');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        apiRequest('GET', `/api/admin/document-expiry?days=${daysAhead}`),
        apiRequest('GET', '/api/admin/document-expiry/stats'),
      ]);
      const docsData = await docsRes.json();
      const statsData = await statsRes.json();
      setDocuments(docsData.expiringDocuments || []);
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load document expiry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [daysAhead]);

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const res = await apiRequest('POST', '/api/admin/document-expiry/send-reminders');
      const data = await res.json();
      toast.success(data.message || 'Reminders sent successfully');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) {
      return <Badge variant="destructive" data-testid={`badge-expired`}>Expired</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-red-100 text-red-700" data-testid={`badge-critical`}>Expires in {days}d</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-700" data-testid={`badge-warning`}>Expires in {days}d</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-700" data-testid={`badge-upcoming`}>Expires in {days}d</Badge>;
    }
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileWarning className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Expiry Management</h1>
              <p className="text-muted-foreground">Monitor and manage expiring KYC documents</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSendReminders} variant="outline" disabled={sending} data-testid="button-send-reminders">
              <Send className={`w-4 h-4 mr-2 ${sending ? 'animate-pulse' : ''}`} />
              {sending ? 'Sending...' : 'Send Reminders'}
            </Button>
            <Button onClick={fetchDocuments} variant="outline" disabled={loading} data-testid="button-refresh">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-red-50 border-red-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-expired-count">{stats.expiredCount}</p>
                    <p className="text-xs text-red-700">Already Expired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600" data-testid="text-7days-count">{stats.expiringIn7Days}</p>
                    <p className="text-xs text-orange-700">Expiring in 7 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-30days-count">{stats.expiringIn30Days}</p>
                    <p className="text-xs text-yellow-700">Expiring in 30 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-90days-count">{stats.expiringIn90Days}</p>
                    <p className="text-xs text-blue-700">Expiring in 90 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expiring Documents</CardTitle>
              <CardDescription>Documents requiring renewal or attention</CardDescription>
            </div>
            <Select value={daysAhead} onValueChange={setDaysAhead}>
              <SelectTrigger className="w-[180px]" data-testid="select-days-ahead">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileWarning className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No documents expiring within {daysAhead} days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`row-document-${doc.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${doc.daysUntilExpiry <= 0 ? 'bg-red-100' : doc.daysUntilExpiry <= 7 ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                        <FileText className={`w-5 h-5 ${doc.daysUntilExpiry <= 0 ? 'text-red-600' : doc.daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatDocumentType(doc.documentType)}</span>
                          {getExpiryBadge(doc.daysUntilExpiry)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {doc.user ? `${doc.user.firstName} ${doc.user.lastName} (${doc.user.email})` : 'Unknown User'}
                        </p>
                        {doc.user?.finatradesId && (
                          <p className="text-xs text-muted-foreground">ID: {doc.user.finatradesId}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{new Date(doc.expiresAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.daysUntilExpiry <= 0 ? 'Expired' : `${doc.daysUntilExpiry} days remaining`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
