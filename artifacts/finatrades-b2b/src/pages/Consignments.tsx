import { useListConsignments, useCreateConsignment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function Consignments() {
  const { data: consignments, isLoading } = useListConsignments();

  if (isLoading) return <div className="p-8">Loading consignments...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Consignments</h1>
          <p className="text-muted-foreground">Manage your physical commodity shipments.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> New Consignment
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Reference</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments && consignments.length > 0 ? (
                consignments.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{item.consignmentRef}</TableCell>
                    <TableCell>{item.commodityType}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.expectedArrival ? format(new Date(item.expectedArrival), 'MMM d, yyyy') : 'TBD'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/consignments/${item.id}`} className="text-accent hover:underline text-sm">
                        View Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No consignments found.
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
