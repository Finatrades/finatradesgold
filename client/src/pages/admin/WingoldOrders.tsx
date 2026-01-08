import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Clock, CheckCircle, XCircle, AlertTriangle, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface WingoldOrder {
  id: string;
  referenceNumber: string;
  userId: string;
  barSize: string;
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  goldPriceUsdPerGram: string;
  status: string;
  wingoldOrderId: string | null;
  wingoldVaultLocationId: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
}

export default function WingoldOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<WingoldOrder | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["wingold-pending-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/wingold/admin/pending-orders");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: allOrdersData, isLoading: allLoading } = useQuery({
    queryKey: ["wingold-all-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/wingold/admin/all-orders");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/wingold/orders/${orderId}/approve`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wingold-pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wingold-all-orders"] });
      setApproveDialogOpen(false);
      setSelectedOrder(null);
      toast.success("Order approved and submitted to Wingold");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve order");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/wingold/orders/${orderId}/reject`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wingold-pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wingold-all-orders"] });
      setRejectDialogOpen(false);
      setSelectedOrder(null);
      toast.success("Order rejected");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject order");
    },
  });

  const pendingOrders: WingoldOrder[] = pendingData?.orders || [];
  const allOrders: WingoldOrder[] = allOrdersData?.orders || [];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" />, label: "Pending Approval" },
      submitted: { variant: "default", icon: <Package className="h-3 w-3" />, label: "Submitted to Wingold" },
      confirmed: { variant: "secondary", icon: <CheckCircle className="h-3 w-3" />, label: "Confirmed" },
      fulfilled: { variant: "secondary", icon: <CheckCircle className="h-3 w-3" />, label: "Fulfilled" },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
      cancelled: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" />, label: "Cancelled" },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
    };
    const c = config[status] || { variant: "outline" as const, icon: null, label: status };
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const renderOrderRow = (order: WingoldOrder, showActions: boolean = false) => (
    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
      <TableCell className="font-mono text-sm">{order.referenceNumber}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{order.userId.slice(0, 8)}...</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium">{order.barCount}x {order.barSize}</span>
      </TableCell>
      <TableCell>
        <span className="text-amber-600 font-medium">{parseFloat(order.totalGrams).toLocaleString()}g</span>
      </TableCell>
      <TableCell>${parseFloat(order.usdAmount).toLocaleString()}</TableCell>
      <TableCell>{getStatusBadge(order.status)}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
      </TableCell>
      {showActions && (
        <TableCell>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(order);
                setApproveDialogOpen(true);
              }}
              disabled={approveMutation.isPending}
              data-testid={`approve-order-${order.id}`}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(order);
                setRejectDialogOpen(true);
              }}
              disabled={rejectMutation.isPending}
              data-testid={`reject-order-${order.id}`}
            >
              Reject
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gold Bar Orders</h1>
            <p className="text-muted-foreground">Manage Wingold & Metals physical gold bar orders</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            {pendingOrders.length} Pending
          </Badge>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Approval
              {pendingOrders.length > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approval</CardTitle>
                <CardDescription>
                  Orders waiting for admin approval before being submitted to Wingold
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending orders
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Gold</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOrders.map((order) => renderOrderRow(order, true))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>
                  Complete history of gold bar orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : allOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Gold</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders.map((order) => renderOrderRow(order, false))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Order</DialogTitle>
              <DialogDescription>
                This will submit the order to Wingold & Metals for fulfillment.
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p><strong>Reference:</strong> {selectedOrder.referenceNumber}</p>
                  <p><strong>Order:</strong> {selectedOrder.barCount}x {selectedOrder.barSize}</p>
                  <p><strong>Total Gold:</strong> <span className="text-amber-600">{parseFloat(selectedOrder.totalGrams).toLocaleString()}g</span></p>
                  <p><strong>Amount:</strong> ${parseFloat(selectedOrder.usdAmount).toLocaleString()}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedOrder && approveMutation.mutate(selectedOrder.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Approve & Submit to Wingold"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
              <DialogDescription>
                This will reject the order. The user will be notified.
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p><strong>Reference:</strong> {selectedOrder.referenceNumber}</p>
                  <p><strong>Order:</strong> {selectedOrder.barCount}x {selectedOrder.barSize}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedOrder && rejectMutation.mutate(selectedOrder.id)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Order"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedOrder && !approveDialogOpen && !rejectDialogOpen} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-mono">{selectedOrder.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm">{selectedOrder.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order</p>
                    <p>{selectedOrder.barCount}x {selectedOrder.barSize}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gold</p>
                    <p className="text-amber-600 font-medium">{parseFloat(selectedOrder.totalGrams).toLocaleString()}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p>${parseFloat(selectedOrder.usdAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gold Price</p>
                    <p>${parseFloat(selectedOrder.goldPriceUsdPerGram).toFixed(2)}/g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p>{format(new Date(selectedOrder.createdAt), "PPpp")}</p>
                  </div>
                  {selectedOrder.wingoldOrderId && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Wingold Order ID</p>
                      <p className="font-mono text-sm">{selectedOrder.wingoldOrderId}</p>
                    </div>
                  )}
                  {selectedOrder.errorMessage && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Error</p>
                      <p className="text-destructive">{selectedOrder.errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
