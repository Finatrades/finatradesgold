import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
  LogIn,
  LogOut,
  KeyRound,
  Shield,
  Smartphone,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  Monitor,
  Settings,
  UserCog,
  FileCheck,
  CreditCard,
  Activity,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: { browser?: string; os?: string; device?: string } | null;
  location: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ActivityLogResponse {
  logs: ActivityLog[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'login_failed', label: 'Failed Login' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'email_change', label: 'Email Change' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'settings_change', label: 'Settings Change' },
  { value: 'mfa_enabled', label: 'MFA Enabled' },
  { value: 'mfa_disabled', label: 'MFA Disabled' },
  { value: 'kyc_submitted', label: 'KYC Submitted' },
  { value: 'kyc_approved', label: 'KYC Approved' },
  { value: 'beneficiary_added', label: 'Beneficiary Added' },
  { value: 'beneficiary_removed', label: 'Beneficiary Removed' },
  { value: 'dca_created', label: 'DCA Plan Created' },
  { value: 'dca_updated', label: 'DCA Plan Updated' },
  { value: 'price_alert_created', label: 'Price Alert Created' },
  { value: 'price_alert_triggered', label: 'Price Alert Triggered' },
];

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'login':
      return <LogIn className="w-4 h-4 text-green-500" />;
    case 'logout':
      return <LogOut className="w-4 h-4 text-gray-500" />;
    case 'login_failed':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'password_change':
      return <KeyRound className="w-4 h-4 text-purple-500" />;
    case 'email_change':
      return <Settings className="w-4 h-4 text-blue-500" />;
    case 'profile_update':
      return <UserCog className="w-4 h-4 text-orange-500" />;
    case 'settings_change':
      return <Settings className="w-4 h-4 text-gray-600" />;
    case 'mfa_enabled':
      return <Shield className="w-4 h-4 text-green-600" />;
    case 'mfa_disabled':
      return <Shield className="w-4 h-4 text-red-500" />;
    case 'kyc_submitted':
      return <FileCheck className="w-4 h-4 text-blue-600" />;
    case 'kyc_approved':
      return <FileCheck className="w-4 h-4 text-green-600" />;
    case 'beneficiary_added':
    case 'beneficiary_removed':
      return <UserCog className="w-4 h-4 text-purple-500" />;
    case 'dca_created':
    case 'dca_updated':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'price_alert_created':
      return <Monitor className="w-4 h-4 text-purple-500" />;
    case 'price_alert_triggered':
      return <Monitor className="w-4 h-4 text-green-500" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActivityBadge = (type: string) => {
  const typeConfig: Record<string, { color: string; label: string }> = {
    login: { color: 'bg-green-100 text-green-700', label: 'Login' },
    logout: { color: 'bg-gray-100 text-gray-700', label: 'Logout' },
    login_failed: { color: 'bg-red-100 text-red-700', label: 'Failed Login' },
    password_change: { color: 'bg-purple-100 text-purple-700', label: 'Password Change' },
    email_change: { color: 'bg-blue-100 text-blue-700', label: 'Email Change' },
    profile_update: { color: 'bg-orange-100 text-orange-700', label: 'Profile Update' },
    settings_change: { color: 'bg-gray-100 text-gray-700', label: 'Settings' },
    mfa_enabled: { color: 'bg-green-100 text-green-700', label: 'MFA Enabled' },
    mfa_disabled: { color: 'bg-red-100 text-red-700', label: 'MFA Disabled' },
    kyc_submitted: { color: 'bg-blue-100 text-blue-700', label: 'KYC Submitted' },
    kyc_approved: { color: 'bg-green-100 text-green-700', label: 'KYC Approved' },
    beneficiary_added: { color: 'bg-purple-100 text-purple-700', label: 'Beneficiary Added' },
    beneficiary_removed: { color: 'bg-red-100 text-red-700', label: 'Beneficiary Removed' },
    dca_created: { color: 'bg-blue-100 text-blue-700', label: 'DCA Created' },
    dca_updated: { color: 'bg-blue-100 text-blue-700', label: 'DCA Updated' },
    price_alert_created: { color: 'bg-purple-100 text-purple-700', label: 'Alert Created' },
    price_alert_triggered: { color: 'bg-green-100 text-green-700', label: 'Alert Triggered' },
  };

  const config = typeConfig[type.toLowerCase()] || { color: 'bg-gray-100 text-gray-700', label: type };
  return <Badge className={config.color}>{config.label}</Badge>;
};

const parseUserAgent = (ua: string | null): { device: string; browser: string } => {
  if (!ua) return { device: 'Unknown', browser: 'Unknown' };
  
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet/i.test(ua)) device = 'Tablet';
  
  let browser = 'Unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  
  return { device, browser };
};

export default function ActivityLogPage() {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, isFetching, refetch, error } = useQuery<ActivityLogResponse>({
    queryKey: ['activity-log', user?.id, activityFilter, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());
      if (activityFilter !== 'all') params.set('type', activityFilter);
      
      const res = await fetch(`/api/activity-log?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activity log');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const activities = data?.logs || [];
  const hasMore = data?.pagination?.hasMore ?? false;

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
  };

  const handleFilterChange = (value: string) => {
    setActivityFilter(value);
    setOffset(0);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent" data-testid="text-page-title">
              Activity Log
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              View your account activity and security events
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="shadow-lg border-purple-100/50">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Recent Activity
              </CardTitle>
              <Select value={activityFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-activity-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
                <h3 className="text-lg font-semibold mb-2 text-red-600">Failed to Load</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  There was an error loading your activity log.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Activity className="w-12 h-12 mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-2">No Activity Found</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {activityFilter !== 'all'
                    ? 'No activities match the selected filter. Try selecting a different activity type.'
                    : 'Your account activity will appear here once you start using the platform.'}
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[500px]">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-[200px]">Activity</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[160px]">Date & Time</TableHead>
                          <TableHead className="w-[120px]">IP Address</TableHead>
                          <TableHead className="w-[150px]">Device</TableHead>
                          <TableHead className="w-[120px]">Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities.map((activity) => {
                          const { device, browser } = parseUserAgent(activity.userAgent);
                          return (
                            <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getActivityIcon(activity.activityType)}
                                  {getActivityBadge(activity.activityType)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-foreground">{activity.description}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  <div>
                                    <p>{format(new Date(activity.createdAt), 'MMM dd, yyyy')}</p>
                                    <p className="text-xs">{format(new Date(activity.createdAt), 'hh:mm a')}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-mono text-muted-foreground">
                                  {activity.ipAddress || '—'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  {device === 'Mobile' ? (
                                    <Smartphone className="w-3.5 h-3.5" />
                                  ) : (
                                    <Monitor className="w-3.5 h-3.5" />
                                  )}
                                  <span>{device} • {browser}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  {activity.location && <MapPin className="w-3.5 h-3.5" />}
                                  <span>{activity.location || '—'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden divide-y">
                    {activities.map((activity) => {
                      const { device, browser } = parseUserAgent(activity.userAgent);
                      return (
                        <div
                          key={activity.id}
                          className="p-4 hover:bg-muted/30 transition-colors"
                          data-testid={`card-activity-${activity.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-purple-100">
                              {getActivityIcon(activity.activityType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getActivityBadge(activity.activityType)}
                              </div>
                              <p className="text-sm text-foreground mb-2">{activity.description}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(activity.createdAt), 'MMM dd, hh:mm a')}
                                </span>
                                {activity.ipAddress && (
                                  <span className="font-mono">{activity.ipAddress}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  {device === 'Mobile' ? (
                                    <Smartphone className="w-3 h-3" />
                                  ) : (
                                    <Monitor className="w-3 h-3" />
                                  )}
                                  {device}
                                </span>
                                {activity.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {activity.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {hasMore && (
                  <div className="flex justify-center p-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      data-testid="button-load-more"
                      className="w-full sm:w-auto"
                    >
                      {isFetching ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      )}
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
