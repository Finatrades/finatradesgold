import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Server, 
  Globe, 
  Clock, 
  Activity,
  Cpu,
  HardDrive,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: string;
  details?: string;
}

interface SystemHealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  uptime: number;
  version: string;
  environment: string;
  lastChecked: string;
  recentErrors: { 
    count: number; 
    lastError?: { message: string; timestamp: string; route?: string } 
  };
  activeSessions: number;
  dbPoolInfo?: {
    total: number;
    idle: number;
    waiting: number;
  };
}

export default function SystemHealth() {
  const { data, isLoading, refetch, isFetching } = useQuery<{ health: SystemHealthData }>({
    queryKey: ['/api/admin/system-health'],
    refetchInterval: 30000,
  });

  const health = data?.health;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-none">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 border-none">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getServiceIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Database': <Database className="h-5 w-5" />,
      'API Server': <Server className="h-5 w-5" />,
      'External APIs': <Globe className="h-5 w-5" />,
      'Session Store': <HardDrive className="h-5 w-5" />,
      'Real-time': <Zap className="h-5 w-5" />,
    };
    return icons[name] || <Activity className="h-5 w-5" />;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              System Health
            </h1>
            <p className="text-gray-500 mt-1">
              Monitor platform status, API health, and database connectivity
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            disabled={isFetching}
            data-testid="button-refresh-health"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !health ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="text-gray-500">Failed to load system health data</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card data-testid="card-overall-status">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      health.overall === 'healthy' ? 'bg-green-100' :
                      health.overall === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {getStatusIcon(health.overall)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Overall Status</p>
                      <p className="text-lg font-bold capitalize">{health.overall}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-uptime">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Uptime</p>
                      <p className="text-lg font-bold">{formatUptime(health.uptime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-sessions">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active Sessions</p>
                      <p className="text-lg font-bold">{health.activeSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-errors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${health.recentErrors.count > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {health.recentErrors.count > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Recent Errors (24h)</p>
                      <p className="text-lg font-bold">{health.recentErrors.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-service-checks">
              <CardHeader>
                <CardTitle>Service Health Checks</CardTitle>
                <CardDescription>Status of individual platform components</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {health.checks.map((check, index) => (
                    <div 
                      key={check.name} 
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } border`}
                      data-testid={`check-${check.name.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          check.status === 'healthy' ? 'bg-green-100' :
                          check.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          {getServiceIcon(check.name)}
                        </div>
                        <div>
                          <p className="font-medium">{check.name}</p>
                          {check.details && (
                            <p className="text-sm text-gray-500">{check.details}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {check.responseTime !== undefined && (
                          <span className="text-sm text-gray-500">
                            {check.responseTime}ms
                          </span>
                        )}
                        {getStatusBadge(check.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {health.dbPoolInfo && (
              <Card data-testid="card-db-pool">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Pool Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{health.dbPoolInfo.total}</p>
                      <p className="text-sm text-gray-500">Total Connections</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{health.dbPoolInfo.idle}</p>
                      <p className="text-sm text-gray-500">Idle</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{health.dbPoolInfo.waiting}</p>
                      <p className="text-sm text-gray-500">Waiting</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {health.recentErrors.lastError && (
              <Card className="border-red-200" data-testid="card-last-error">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Last Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="font-mono text-sm text-red-700">{health.recentErrors.lastError.message}</p>
                    <div className="flex gap-4 mt-2 text-xs text-red-500">
                      {health.recentErrors.lastError.route && (
                        <span>Route: {health.recentErrors.lastError.route}</span>
                      )}
                      <span>
                        {format(new Date(health.recentErrors.lastError.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-system-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Version</p>
                    <p className="font-medium">{health.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Environment</p>
                    <Badge variant="outline" className="mt-1">{health.environment}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Check</p>
                    <p className="font-medium">
                      {format(new Date(health.lastChecked), 'HH:mm:ss')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Node.js</p>
                    <p className="font-medium">{process.env.NODE_ENV || 'development'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
