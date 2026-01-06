import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  Clock, Play, Pause, RefreshCw, CheckCircle, XCircle, 
  Activity, Calendar, Timer, AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ScheduledJob {
  id: string;
  name: string;
  description: string | null;
  cronExpression: string | null;
  intervalMs: number | null;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'running';
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  lastRunResult: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  runCount: number;
  failCount: number;
  createdAt: string;
}

interface JobRun {
  id: string;
  jobId: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  success: boolean | null;
  result: string | null;
  error: string | null;
}

export default function ScheduledJobs() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);

  const { data: jobsData, isLoading, refetch } = useQuery<{ jobs: ScheduledJob[] }>({
    queryKey: ['/api/admin/scheduled-jobs'],
  });

  const { data: runsData } = useQuery<{ runs: JobRun[] }>({
    queryKey: ['/api/admin/scheduled-jobs', selectedJob?.id, 'runs'],
    enabled: !!selectedJob,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' | 'run' }) =>
      apiRequest('POST', `/api/admin/scheduled-jobs/${id}/${action}`),
    onSuccess: () => {
      toast.success('Job updated');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduled-jobs'] });
    },
    onError: () => toast.error('Failed to update job'),
  });

  const jobs = jobsData?.jobs || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success-muted text-success-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge className="bg-warning-muted text-warning-muted-foreground"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'running':
        return <Badge className="bg-info-muted text-info-muted-foreground"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSuccessRate = (job: ScheduledJob) => {
    if (job.runCount === 0) return 0;
    return ((job.runCount - job.failCount) / job.runCount) * 100;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-jobs-title">Scheduled Jobs</h1>
            <p className="text-muted-foreground mt-1">Background task monitoring and management</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-muted rounded-lg">
                  <CheckCircle className="w-6 h-6 text-success-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'active').length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-info-muted rounded-lg">
                  <RefreshCw className="w-6 h-6 text-info-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'running').length}</p>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'failed').length}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled jobs configured</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedJob(job)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-xs text-muted-foreground">{job.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {job.cronExpression || (job.intervalMs ? `Every ${formatDuration(job.intervalMs)}` : '-')}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.lastRunAt ? (
                          <div>
                            <p className="text-sm">{formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true })}</p>
                            <p className="text-xs text-muted-foreground">{formatDuration(job.lastRunDurationMs)}</p>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {job.nextRunAt ? (
                          <p className="text-sm">{formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true })}</p>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={getSuccessRate(job)} className="w-16 h-2" />
                          <span className="text-sm">{getSuccessRate(job).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {job.status === 'active' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleMutation.mutate({ id: job.id, action: 'pause' })}
                              disabled={toggleMutation.isPending}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : job.status === 'paused' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleMutation.mutate({ id: job.id, action: 'resume' })}
                              disabled={toggleMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleMutation.mutate({ id: job.id, action: 'run' })}
                            disabled={toggleMutation.isPending || job.status === 'running'}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedJob?.name}</DialogTitle>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Runs</p>
                    <p className="text-xl font-bold">{selectedJob.runCount}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Failed Runs</p>
                    <p className="text-xl font-bold text-destructive">{selectedJob.failCount}</p>
                  </div>
                </div>

                {selectedJob.lastError && (
                  <div className="p-4 bg-error-muted rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">Last Error</p>
                    <p className="text-sm font-mono">{selectedJob.lastError}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-3">Recent Runs</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(runsData?.runs || []).slice(0, 10).map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>{format(new Date(run.startedAt), 'MMM d, HH:mm:ss')}</TableCell>
                          <TableCell>{formatDuration(run.durationMs)}</TableCell>
                          <TableCell>
                            {run.success === null ? (
                              <Badge className="bg-info-muted text-info-muted-foreground">Running</Badge>
                            ) : run.success ? (
                              <Badge className="bg-success-muted text-success-muted-foreground">Success</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {run.error || run.result || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!runsData?.runs || runsData.runs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No run history
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
