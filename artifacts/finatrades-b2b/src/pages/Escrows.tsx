import { useListEscrows } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Escrows() {
  const { data: escrows, isLoading } = useListEscrows();

  if (isLoading) return <div className="p-8">Loading Escrow Accounts...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Escrow Accounts</h1>
          <p className="text-muted-foreground">Manage locked funds and milestones.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Locked Date</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escrows && escrows.length > 0 ? (
                escrows.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium">{item.escrowRef}</TableCell>
                    <TableCell>${item.amount?.toLocaleString()} {item.currency}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.lockDate ? format(new Date(item.lockDate), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell>{item.releaseDate ? format(new Date(item.releaseDate), 'MMM d, yyyy') : 'Pending'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/escrow/${item.id}`} className="text-accent hover:underline text-sm">
                        View Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No active escrow accounts.
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
