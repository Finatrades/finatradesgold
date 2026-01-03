import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, Play, Pause, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface QueueJob {
  id: string;
  name: string;
  data: Record<string, any>;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
  finishedAt: string | null;
}

export default function QueueMonitor() {
  const queryClient = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/queues');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['queue-jobs', selectedQueue],
    queryFn: async () => {
      if (!selectedQueue) return { jobs: [] };
      const res = await apiRequest('GET', `/api/admin/queues/${selectedQueue}/jobs`);
      return res.json();
    },
    enabled: !!selectedQueue,
    refetchInterval: 5000,
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ queue, pause }: { queue: string; pause: boolean }) => {
      const res = await apiRequest('POST', `/api/admin/queues/${queue}/${pause ? 'pause' : 'resume'}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
      toast.success('Queue updated');
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ queue, jobId }: { queue: string; jobId: string }) => {
      const res = await apiRequest('POST', `/api/admin/queues/${queue}/jobs/${jobId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-jobs', selectedQueue] });
      toast.success('Job queued for retry');
    },
  });

  const clearMutation = useMutation({
    mutationFn: async ({ queue, status }: { queue: string; status: string }) => {
      const res = await apiRequest('DELETE', `/api/admin/queues/${queue}/${status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
      queryClient.invalidateQueries({ queryKey: ['queue-jobs', selectedQueue] });
      toast.success('Jobs cleared');
    },
  });

  const queues: QueueStats[] = data?.queues || [];
  const jobs: QueueJob[] = jobsData?.jobs || [];

  const totalStats = {
    waiting: queues.reduce((sum, q) => sum + q.waiting, 0),
    active: queues.reduce((sum, q) => sum + q.active, 0),
    completed: queues.reduce((sum, q) => sum + q.completed, 0),
    failed: queues.reduce((sum, q) => sum + q.failed, 0),
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      waiting: 'bg-yellow-100 text-yellow-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      delayed: 'bg-purple-100 text-purple-700',
    };
    return <Badge className={styles[status] || ''}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Queue Monitor</h1>
            <p className="text-muted-foreground">Monitor background job processing</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.waiting}</p>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.completed.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{totalStats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Queues</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : queues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No queues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queues.map((queue) => (
                    <div 
                      key={queue.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedQueue === queue.name ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedQueue(queue.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{queue.name}</span>
                        <div className="flex items-center gap-1">
                          {queue.paused && <Badge variant="secondary">Paused</Badge>}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseMutation.mutate({ queue: queue.name, pause: !queue.paused });
                            }}
                          >
                            {queue.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="text-center">
                          <p className="font-bold text-yellow-600">{queue.waiting}</p>
                          <p className="text-muted-foreground">Wait</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-600">{queue.active}</p>
                          <p className="text-muted-foreground">Active</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">{queue.completed}</p>
                          <p className="text-muted-foreground">Done</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-red-600">{queue.failed}</p>
                          <p className="text-muted-foreground">Fail</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Jobs {selectedQueue && `- ${selectedQueue}`}</CardTitle>
                {selectedQueue && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => clearMutation.mutate({ queue: selectedQueue, status: 'failed' })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Clear Failed
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedQueue ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a queue to view jobs</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No jobs in this queue</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{job.id}</code>
                          {getStatusBadge(job.status)}
                        </div>
                        {job.status === 'failed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => retryMutation.mutate({ queue: selectedQueue, jobId: job.id })}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                          </Button>
                        )}
                      </div>
                      <p className="text-sm font-medium">{job.name}</p>
                      {job.progress > 0 && job.progress < 100 && (
                        <Progress value={job.progress} className="mt-2" />
                      )}
                      {job.error && (
                        <p className="text-sm text-destructive mt-2">{job.error}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                        <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
