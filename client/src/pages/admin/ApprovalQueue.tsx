import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle, XCircle, AlertTriangle, FileText, User, Calendar, MessageSquare, ChevronRight, History } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";

interface ApprovalItem {
  id: string;
  task_definition_id: string;
  task_name: string;
  task_slug: string;
  category: string;
  initiator_id: string;
  initiator_email: string;
  initiator_name: string;
  entity_type: string | null;
  entity_id: string | null;
  task_data: Record<string, any>;
  status: string;
  priority: string;
  reason: string | null;
  l1_approver_id: string | null;
  l1_approved_at: string | null;
  l1_comments: string | null;
  final_approver_id: string | null;
  final_approved_at: string | null;
  final_comments: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  created_at: string;
}

interface HistoryItem {
  id: string;
  action: string;
  actor_email: string;
  actor_name: string;
  comments: string | null;
  created_at: string;
}

export default function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve_l1" | "approve_final" | "reject" | null>(null);
  const [comments, setComments] = useState("");

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/rbac/pending-approvals");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: allApprovalsData, isLoading: allLoading } = useQuery({
    queryKey: ["approval-queue", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/admin/rbac/approvals" : `/api/admin/rbac/approvals?status=${statusFilter}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: approvalDetailData, isLoading: detailLoading } = useQuery({
    queryKey: ["approval-detail", selectedApproval?.id],
    queryFn: async () => {
      if (!selectedApproval) return null;
      const res = await apiRequest("GET", `/api/admin/rbac/approvals/${selectedApproval.id}`);
      return res.json();
    },
    enabled: !!selectedApproval,
  });

  const processApprovalMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: string; comments: string }) => {
      const res = await apiRequest("POST", `/api/admin/rbac/approvals/${id}/process`, { action, comments });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["approval-detail", selectedApproval?.id] });
      setActionDialogOpen(false);
      setComments("");
      setActionType(null);
      toast.success("Approval processed successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process approval");
    },
  });

  const pendingApprovals: ApprovalItem[] = pendingData?.approvals || [];
  const allApprovals: ApprovalItem[] = allApprovalsData?.queue || [];
  const history: HistoryItem[] = approvalDetailData?.history || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending_l1: { variant: "outline", icon: <Clock className="h-3 w-3" />, label: "Awaiting L1" },
      pending_final: { variant: "default", icon: <Clock className="h-3 w-3" />, label: "Awaiting Final" },
      approved: { variant: "secondary", icon: <CheckCircle className="h-3 w-3" />, label: "Approved" },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
      expired: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" />, label: "Expired" },
      cancelled: { variant: "secondary", icon: <XCircle className="h-3 w-3" />, label: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "outline" as const, icon: null, label: status };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleAction = (type: "approve_l1" | "approve_final" | "reject") => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  const submitAction = () => {
    if (!selectedApproval || !actionType) return;
    processApprovalMutation.mutate({
      id: selectedApproval.id,
      action: actionType,
      comments,
    });
  };

  const canApproveL1 = selectedApproval?.status === "pending_l1";
  const canApproveFinal = selectedApproval?.status === "pending_final";
  const canReject = selectedApproval?.status === "pending_l1" || selectedApproval?.status === "pending_final";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Approval Queue</h1>
          <p className="text-muted-foreground">Review and process pending approval requests</p>
        </div>
        {pendingApprovals.length > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingApprovals.length} Pending
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Requests
            </CardTitle>
            <CardDescription>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending_l1">Pending L1</SelectItem>
                  <SelectItem value="pending_final">Pending Final</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {(pendingLoading || allLoading) ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : allApprovals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No approval requests found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {allApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      data-testid={`approval-item-${approval.id}`}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedApproval?.id === approval.id ? "bg-muted" : ""}`}
                      onClick={() => setSelectedApproval(approval)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{approval.task_name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <User className="h-3 w-3" />
                        {approval.initiator_name || approval.initiator_email}
                      </div>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(approval.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedApproval ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedApproval.task_name}
                      {getStatusBadge(selectedApproval.status)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {selectedApproval.initiator_name || selectedApproval.initiator_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(selectedApproval.created_at), "PPp")}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {canApproveL1 && (
                      <Button data-testid="btn-approve-l1" onClick={() => handleAction("approve_l1")}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        L1 Approve
                      </Button>
                    )}
                    {canApproveFinal && (
                      <Button data-testid="btn-approve-final" onClick={() => handleAction("approve_final")}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Final Approve
                      </Button>
                    )}
                    {canReject && (
                      <Button data-testid="btn-reject" variant="destructive" onClick={() => handleAction("reject")}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-4 space-y-4">
                    {selectedApproval.reason && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Reason</Label>
                        <p className="mt-1">{selectedApproval.reason}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                        <p className="capitalize">{selectedApproval.category}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                        <p className="capitalize">{selectedApproval.priority || "Normal"}</p>
                      </div>
                      {selectedApproval.entity_type && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Entity Type</Label>
                          <p>{selectedApproval.entity_type}</p>
                        </div>
                      )}
                      {selectedApproval.entity_id && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Entity ID</Label>
                          <p className="font-mono text-sm">{selectedApproval.entity_id}</p>
                        </div>
                      )}
                      {selectedApproval.expires_at && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Expires</Label>
                          <p>{format(new Date(selectedApproval.expires_at), "PPp")}</p>
                        </div>
                      )}
                    </div>

                    {selectedApproval.task_data && Object.keys(selectedApproval.task_data).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Task Data</Label>
                        <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-sm">
                          {JSON.stringify(selectedApproval.task_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedApproval.l1_approved_at && (
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">L1 Approved</span>
                        </div>
                        <p className="text-sm">{format(new Date(selectedApproval.l1_approved_at), "PPp")}</p>
                        {selectedApproval.l1_comments && (
                          <p className="text-sm mt-2 text-muted-foreground">{selectedApproval.l1_comments}</p>
                        )}
                      </div>
                    )}

                    {selectedApproval.final_approved_at && (
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Final Approved</span>
                        </div>
                        <p className="text-sm">{format(new Date(selectedApproval.final_approved_at), "PPp")}</p>
                        {selectedApproval.final_comments && (
                          <p className="text-sm mt-2 text-muted-foreground">{selectedApproval.final_comments}</p>
                        )}
                      </div>
                    )}

                    {selectedApproval.rejected_at && (
                      <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                          <XCircle className="h-4 w-4" />
                          <span className="font-medium">Rejected</span>
                        </div>
                        <p className="text-sm">{format(new Date(selectedApproval.rejected_at), "PPp")}</p>
                        {selectedApproval.rejection_reason && (
                          <p className="text-sm mt-2 text-muted-foreground">{selectedApproval.rejection_reason}</p>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="history" className="mt-4">
                    {detailLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>No history available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {history.map((item, index) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </div>
                              {index < history.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{item.action.replace(/_/g, " ")}</span>
                                <span className="text-sm text-muted-foreground">by {item.actor_name || item.actor_email}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "PPp")}</p>
                              {item.comments && <p className="text-sm mt-2 text-muted-foreground">{item.comments}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-30" />
              <p>Select a request to view details</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve_l1" && "L1 Approval"}
              {actionType === "approve_final" && "Final Approval"}
              {actionType === "reject" && "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve_l1" && "Approve this request at Level 1. It will proceed to final approval."}
              {actionType === "approve_final" && "Grant final approval. This action will be executed."}
              {actionType === "reject" && "Reject this request. Please provide a reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">{actionType === "reject" ? "Rejection Reason (Required)" : "Comments (Optional)"}</Label>
              <Textarea
                id="comments"
                data-testid="input-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={actionType === "reject" ? "Enter reason for rejection..." : "Add any comments..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button
              data-testid="btn-confirm-action"
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={submitAction}
              disabled={processApprovalMutation.isPending || (actionType === "reject" && !comments.trim())}
            >
              {actionType === "reject" ? "Reject" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
