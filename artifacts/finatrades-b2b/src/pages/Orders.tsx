import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders();

  if (isLoading) return <div className="p-8">Loading Orders...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Track transaction status and pipeline.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Order Ref</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 ? (
                orders.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium">{item.orderRef}</TableCell>
                    <TableCell>{item.buyerName || item.sellerName}</TableCell>
                    <TableCell>{item.commodity} ({item.quantity} {item.unit})</TableCell>
                    <TableCell>${item.totalValue?.toLocaleString()} {item.currency}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(item.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/orders/${item.id}`} className="text-accent hover:underline text-sm">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No purchase orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
