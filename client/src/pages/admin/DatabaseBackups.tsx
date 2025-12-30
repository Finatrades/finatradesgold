import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Database, 
  Download, 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Shield,
  AlertTriangle,
  FileArchive,
  HardDrive,
  History,
  KeyRound,
  ArrowRightLeft,
  Play,
  Pause,
  Cloud,
  Server,
  Zap
} from "lucide-react";

interface Backup {
  id: string;
  backupType: string;
  fileName: string;
  fileSizeBytes: number | null;
  status: string;
  tablesIncluded: number | null;
  totalRows: number | null;
  createdBy: string | null;
  creatorEmail: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  backupId: string | null;
  actorAdminId: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  result: string;
  errorMessage: string | null;
  metadata: any;
  createdAt: string;
}

interface SyncStatus {
  scheduler: {
    isRunning: boolean;
    isSyncing: boolean;
    lastSync: {
      success: boolean;
      timestamp: string;
      direction: string;
      tablesCount?: number;
      duration?: number;
      error?: string;
    } | null;
    nextSyncIn: string | null;
  };
  databases: {
    aws: { tables: number; users: number };
    replit: { tables: number; users: number };
    inSync: boolean;
  };
  syncDirection: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Success":
      return <Badge className="bg-success-muted text-success-muted-foreground" data-testid="badge-status-success"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
    case "Failed":
      return <Badge className="bg-error-muted text-error-muted-foreground" data-testid="badge-status-failed"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "In Progress":
      return <Badge className="bg-info-muted text-info-muted-foreground" data-testid="badge-status-progress"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getBackupTypeBadge(type: string) {
  switch (type) {
    case "manual":
      return <Badge variant="outline">Manual</Badge>;
    case "scheduled":
      return <Badge variant="outline" className="border-blue-400">Scheduled</Badge>;
    case "pre_restore":
      return <Badge variant="outline" className="border-warning">Pre-Restore</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function getActionBadge(action: string) {
  switch (action) {
    case "BACKUP_CREATE":
      return <Badge className="bg-success-muted text-success-muted-foreground">Create</Badge>;
    case "BACKUP_DOWNLOAD":
      return <Badge className="bg-info-muted text-info-muted-foreground">Download</Badge>;
    case "BACKUP_RESTORE":
      return <Badge className="bg-warning-muted text-warning-muted-foreground">Restore</Badge>;
    case "BACKUP_DELETE":
      return <Badge className="bg-error-muted text-error-muted-foreground">Delete</Badge>;
    default:
      return <Badge variant="secondary">{action}</Badge>;
  }
}

export default function DatabaseBackups() {
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  const { data: backupsData, isLoading: loadingBackups, refetch: refetchBackups } = useQuery<{ backups: Backup[] }>({
    queryKey: ["/api/admin/backups"],
  });
  
  const { data: auditLogsData, isLoading: loadingLogs } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ["/api/admin/backup-audit-logs"],
  });
  
  const { data: syncStatusData, isLoading: loadingSyncStatus, refetch: refetchSyncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/admin/database-sync/status"],
    refetchInterval: 30000,
  });
  
  const triggerSyncMutation = useMutation({
    mutationFn: async (direction: string) => {
      const res = await fetch("/api/admin/database-sync/trigger", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to trigger sync");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Database sync completed", {
        description: data.result?.message || "Sync finished successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-sync/status"] });
    },
    onError: (error: Error) => {
      toast.error("Sync failed", {
        description: error.message,
      });
    },
  });
  
  const schedulerControlMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      const res = await fetch("/api/admin/database-sync/scheduler", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to control scheduler");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Scheduler ${data.message?.includes('started') ? 'started' : 'stopped'}`, {
        description: data.status?.isRunning ? "Auto-sync is now active" : "Auto-sync is paused",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-sync/status"] });
    },
    onError: (error: Error) => {
      toast.error("Scheduler control failed", {
        description: error.message,
      });
    },
  });
  
  const createBackupMutation = useMutation({
    mutationFn: async (otp: string) => {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({ otpCode: otp }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create backup");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Backup created successfully", {
        description: `File: ${data.backup?.fileName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-audit-logs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create backup", {
        description: error.message,
      });
    },
  });
  
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const res = await fetch(`/api/admin/backups/${backupId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete backup");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Backup deleted successfully");
      setShowDeleteDialog(false);
      setSelectedBackup(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-audit-logs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete backup", {
        description: error.message,
      });
    },
  });
  
  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backupId, otp }: { backupId: string; otp: string }) => {
      const res = await fetch(`/api/admin/backups/${backupId}/restore`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({ confirmed: true, otpCode: otp }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to restore backup");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Database restored successfully", {
        description: `Restored ${data.userCount} users and ${data.transactionCount} transactions`,
      });
      setShowRestoreDialog(false);
      setSelectedBackup(null);
      setOtpCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-audit-logs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to restore backup", {
        description: error.message,
      });
    },
  });
  
  const handleDownload = async (backup: Backup, otp: string) => {
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}/download`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({ otpCode: otp }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to download backup");
      }
      
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : backup.fileName;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Backup downloaded successfully");
    } catch (error: any) {
      toast.error("Failed to download backup", {
        description: error.message,
      });
    } finally {
      setShowDownloadDialog(false);
      setSelectedBackup(null);
      setOtpCode("");
    }
  };
  
  const handleCreateBackup = () => {
    createBackupMutation.mutate(otpCode);
    setShowCreateDialog(false);
    setOtpCode("");
  };
  
  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate({ backupId: selectedBackup.id, otp: otpCode });
    }
  };
  
  const backups = backupsData?.backups || [];
  const auditLogs = auditLogsData?.logs || [];
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-backups">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Backups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="text-backup-count">{backups.length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-successful-backups">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">{backups.filter(b => b.status === "Success").length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-total-storage">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-info" />
                <span className="text-2xl font-bold">
                  {formatBytes(backups.reduce((sum, b) => sum + (b.fileSizeBytes || 0), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-last-backup">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Backup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {backups[0]?.createdAt 
                    ? format(new Date(backups[0].createdAt), "MMM d, HH:mm") 
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="backups" className="w-full">
          <TabsList>
            <TabsTrigger value="backups" data-testid="tab-backups">
              <FileArchive className="w-4 h-4 mr-2" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="sync" data-testid="tab-sync">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Database Sync
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="w-4 h-4 mr-2" />
              Audit Log
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="backups" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Backup History</CardTitle>
                  <CardDescription>All database backups created on this platform</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchBackups()}
                    data-testid="button-refresh-backups"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    disabled={createBackupMutation.isPending}
                    data-testid="button-create-backup"
                  >
                    {createBackupMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Create Backup
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBackups ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No backups found. Create your first backup to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Tables</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id} data-testid={`row-backup-${backup.id}`}>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate" title={backup.fileName}>
                            {backup.fileName}
                          </TableCell>
                          <TableCell>{getBackupTypeBadge(backup.backupType)}</TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell>{formatBytes(backup.fileSizeBytes)}</TableCell>
                          <TableCell>{backup.tablesIncluded || "—"}</TableCell>
                          <TableCell>{backup.totalRows?.toLocaleString() || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={backup.creatorEmail || ""}>
                            {backup.creatorEmail || "System"}
                          </TableCell>
                          <TableCell>{format(new Date(backup.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {backup.status === "Success" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedBackup(backup);
                                      setShowDownloadDialog(true);
                                    }}
                                    title="Download"
                                    data-testid={`button-download-${backup.id}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedBackup(backup);
                                      setShowRestoreDialog(true);
                                    }}
                                    title="Restore"
                                    data-testid={`button-restore-${backup.id}`}
                                  >
                                    <RotateCcw className="w-4 h-4 text-warning" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete"
                                data-testid={`button-delete-${backup.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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
          </TabsContent>
          
          <TabsContent value="sync" className="mt-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card data-testid="card-aws-status">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      AWS RDS (Primary)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {syncStatusData?.databases?.aws ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">
                          {syncStatusData?.databases?.aws ? "Connected" : "Checking..."}
                        </span>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{syncStatusData?.databases?.aws?.users?.toLocaleString() || 0} users</div>
                        <div>{syncStatusData?.databases?.aws?.tables || 0} tables</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-replit-status">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Replit (Backup)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {syncStatusData?.databases?.replit ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">
                          {syncStatusData?.databases?.replit ? "Connected" : "Checking..."}
                        </span>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{syncStatusData?.databases?.replit?.users?.toLocaleString() || 0} users</div>
                        <div>{syncStatusData?.databases?.replit?.tables || 0} tables</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-sync-status">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" />
                      Sync Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {syncStatusData?.databases?.inSync ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-warning" />
                        )}
                        <span className="font-medium">
                          {syncStatusData?.databases?.inSync ? "In Sync" : "Out of Sync"}
                        </span>
                      </div>
                      {syncStatusData?.scheduler?.isSyncing && (
                        <span className="text-sm text-info flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Syncing...
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Auto-Sync Scheduler
                    </CardTitle>
                    <CardDescription>
                      {syncStatusData?.syncDirection || "Automatic sync from AWS RDS to Replit backup"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchSyncStatus()}
                      data-testid="button-refresh-sync"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    {syncStatusData?.scheduler?.isRunning ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => schedulerControlMutation.mutate('stop')}
                        disabled={schedulerControlMutation.isPending}
                        data-testid="button-stop-scheduler"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        {schedulerControlMutation.isPending ? "Stopping..." : "Stop Scheduler"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => schedulerControlMutation.mutate('start')}
                        disabled={schedulerControlMutation.isPending}
                        data-testid="button-start-scheduler"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {schedulerControlMutation.isPending ? "Starting..." : "Start Scheduler"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSyncStatus ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Scheduler</p>
                          <div className="flex items-center gap-2 mt-1">
                            {syncStatusData?.scheduler?.isRunning ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="font-medium text-success">Running</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                <span className="font-medium text-muted-foreground">Stopped</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Last Sync</p>
                          <p className="font-medium mt-1">
                            {syncStatusData?.scheduler?.lastSync?.timestamp 
                              ? format(new Date(syncStatusData.scheduler.lastSync.timestamp), "MMM d, HH:mm")
                              : "Never"}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Next Sync In</p>
                          <p className="font-medium mt-1">
                            {syncStatusData?.scheduler?.nextSyncIn || "—"}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Tables Synced</p>
                          <p className="font-medium mt-1">{syncStatusData?.scheduler?.lastSync?.tablesCount || 0}</p>
                        </div>
                      </div>
                      
                      {syncStatusData?.scheduler?.lastSync && (
                        <div className={`p-3 rounded-lg ${
                          syncStatusData.scheduler.lastSync.success 
                            ? 'bg-success-muted' 
                            : 'bg-error-muted'
                        }`}>
                          <div className="flex items-center gap-2">
                            {syncStatusData.scheduler.lastSync.success ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                            <span className="font-medium">
                              Last sync: {syncStatusData.scheduler.lastSync.success ? 'Success' : 'Failed'}
                              {syncStatusData.scheduler.lastSync.error && ` - ${syncStatusData.scheduler.lastSync.error}`}
                            </span>
                            {syncStatusData.scheduler.lastSync.duration && (
                              <span className="text-sm text-muted-foreground ml-auto">
                                Duration: {(syncStatusData.scheduler.lastSync.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Manual Sync</CardTitle>
                  <CardDescription>Trigger a database sync manually between AWS RDS and Replit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={() => triggerSyncMutation.mutate('aws-to-replit')}
                      disabled={triggerSyncMutation.isPending}
                      data-testid="button-sync-aws-to-replit"
                    >
                      {triggerSyncMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4 mr-2" />
                          AWS → Replit
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => triggerSyncMutation.mutate('replit-to-aws')}
                      disabled={triggerSyncMutation.isPending}
                      data-testid="button-sync-replit-to-aws"
                    >
                      {triggerSyncMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Server className="w-4 h-4 mr-2" />
                          Replit → AWS
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-warning-muted rounded-lg">
                    <p className="text-sm text-warning-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Warning:</strong> Manual sync will overwrite the target database with data from the source. 
                        AWS → Replit is the default safe direction. Use Replit → AWS only if you need to restore AWS from a backup.
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Backup Audit Log
                </CardTitle>
                <CardDescription>Track all backup-related operations for security and compliance</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                          <TableCell>{format(new Date(log.createdAt), "MMM d, HH:mm:ss")}</TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            {log.result === "SUCCESS" ? (
                              <Badge className="bg-success-muted text-success-muted-foreground">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge className="bg-error-muted text-error-muted-foreground">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={log.actorEmail || ""}>
                            {log.actorEmail || "Unknown"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.ipAddress || "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.errorMessage || (log.metadata ? JSON.stringify(log.metadata) : "—")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
              <div className="mt-4 p-3 bg-muted rounded-md font-mono text-sm">
                {selectedBackup?.fileName}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && deleteBackupMutation.mutate(selectedBackup.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBackupMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteBackupMutation.isPending ? "Deleting..." : "Delete Backup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showRestoreDialog} onOpenChange={(open) => { setShowRestoreDialog(open); if (!open) setOtpCode(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Restore Database
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Warning:</strong> This will replace all current database data with the data from this backup.
                </p>
                
                <div className="p-3 bg-warning-muted rounded-md">
                  <p className="text-sm text-warning-muted-foreground">
                    <strong>A pre-restore snapshot will be created automatically</strong> so you can revert if needed.
                  </p>
                </div>
                
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  <div>File: {selectedBackup?.fileName}</div>
                  <div>Created: {selectedBackup?.createdAt && format(new Date(selectedBackup.createdAt), "MMM d, yyyy HH:mm")}</div>
                  <div>Rows: {selectedBackup?.totalRows?.toLocaleString()}</div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="restore-otp" className="flex items-center gap-2 text-foreground">
                    <KeyRound className="w-4 h-4" />
                    Enter OTP Code
                  </Label>
                  <Input
                    id="restore-otp"
                    type="text"
                    placeholder="Enter 6-digit code from authenticator"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="font-mono text-center text-lg tracking-widest"
                    data-testid="input-restore-otp"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={restoreBackupMutation.isPending || otpCode.length !== 6}
              data-testid="button-confirm-restore"
            >
              {restoreBackupMutation.isPending ? "Restoring..." : "Restore Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setOtpCode(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Create Database Backup
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Create a full backup of the database. This may take a few minutes depending on the data size.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="create-otp" className="flex items-center gap-2 text-foreground">
                    <KeyRound className="w-4 h-4" />
                    Enter OTP Code
                  </Label>
                  <Input
                    id="create-otp"
                    type="text"
                    placeholder="Enter 6-digit code from authenticator"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="font-mono text-center text-lg tracking-widest"
                    data-testid="input-create-otp"
                  />
                  <p className="text-xs text-muted-foreground">
                    Two-factor authentication is required for backup operations.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-create">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateBackup}
              disabled={createBackupMutation.isPending || otpCode.length !== 6}
              data-testid="button-confirm-create"
            >
              {createBackupMutation.isPending ? "Creating..." : "Create Backup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDownloadDialog} onOpenChange={(open) => { setShowDownloadDialog(open); if (!open) setOtpCode(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Download Backup
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Download backup file for secure offsite storage.
                </p>
                
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {selectedBackup?.fileName}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="download-otp" className="flex items-center gap-2 text-foreground">
                    <KeyRound className="w-4 h-4" />
                    Enter OTP Code
                  </Label>
                  <Input
                    id="download-otp"
                    type="text"
                    placeholder="Enter 6-digit code from authenticator"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="font-mono text-center text-lg tracking-widest"
                    data-testid="input-download-otp"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-download">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && handleDownload(selectedBackup, otpCode)}
              disabled={otpCode.length !== 6}
              data-testid="button-confirm-download"
            >
              Download Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
