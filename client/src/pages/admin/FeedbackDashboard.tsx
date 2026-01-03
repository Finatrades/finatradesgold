import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquare, ThumbsUp, ThumbsDown, Star, TrendingUp, RefreshCw, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'bug' | 'feature' | 'complaint' | 'praise' | 'general';
  rating: number | null;
  message: string;
  status: 'new' | 'reviewed' | 'responded' | 'resolved';
  adminResponse: string | null;
  createdAt: string;
}

export default function FeedbackDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [respondOpen, setRespondOpen] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [response, setResponse] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feedback', filter],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/feedback?filter=${filter}`);
      return res.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const res = await apiRequest('POST', `/api/admin/feedback/${id}/respond`, { response });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setRespondOpen(false);
      setResponse('');
      toast.success('Response sent');
    },
  });

  const feedbacks: Feedback[] = data?.feedbacks || [];
  const stats = data?.stats || { total: 0, avgRating: 0, nps: 0, responseRate: 0 };
  const ratingDistribution = data?.ratingDistribution || [];
  const trendData = data?.trendData || [];

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      bug: 'bg-red-100 text-red-700',
      feature: 'bg-blue-100 text-blue-700',
      complaint: 'bg-orange-100 text-orange-700',
      praise: 'bg-green-100 text-green-700',
      general: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[type] || colors.general}>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-yellow-100 text-yellow-700',
      reviewed: 'bg-blue-100 text-blue-700',
      responded: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Feedback Dashboard</h1>
            <p className="text-muted-foreground">User satisfaction and NPS tracking</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-8 h-8 ${stats.nps >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-2xl font-bold">{stats.nps}</p>
                  <p className="text-sm text-muted-foreground">NPS Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Reply className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.responseRate}%</p>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="rating" className="text-xs" width={60} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Feedback</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="bug">Bugs</SelectItem>
                  <SelectItem value="feature">Features</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No feedback found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeBadge(feedback.type)}
                          {getStatusBadge(feedback.status)}
                          {renderStars(feedback.rating)}
                        </div>
                        <p className="text-sm">{feedback.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{feedback.userName}</span>
                          <span>{formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}</span>
                        </div>
                        {feedback.adminResponse && (
                          <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                            <p className="text-xs text-muted-foreground mb-1">Admin Response:</p>
                            <p>{feedback.adminResponse}</p>
                          </div>
                        )}
                      </div>
                      {!feedback.adminResponse && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelected(feedback); setRespondOpen(true); }}
                        >
                          <Reply className="w-4 h-4 mr-1" /> Respond
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{selected.message}</p>
                <p className="text-xs text-muted-foreground mt-2">From: {selected.userName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Your Response</label>
                <Textarea 
                  placeholder="Type your response..." 
                  rows={4}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>Cancel</Button>
            <Button onClick={() => selected && respondMutation.mutate({ id: selected.id, response })}>
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
