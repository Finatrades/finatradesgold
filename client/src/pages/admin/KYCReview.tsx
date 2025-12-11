import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, User, Building, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function KYCReview() {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  const mockApplications = [
    { 
      id: 1, 
      name: 'Sarah Johnson', 
      type: 'Personal', 
      status: 'Pending', 
      date: '2024-12-11',
      documents: {
        id: 'passport_scan.jpg',
        selfie: 'selfie.jpg',
        proof: 'utility_bill.pdf'
      }
    },
    { 
      id: 2, 
      name: 'TechCorp Solutions AG', 
      type: 'Corporate', 
      status: 'Pending', 
      date: '2024-12-11',
      documents: {
        id: 'manager_id.jpg',
        registration: 'cert_incorporation.pdf',
        articles: 'articles_assoc.pdf',
        proof: 'bank_statement.pdf'
      }
    },
  ];

  const handleApprove = () => {
    toast.success(`Application for ${selectedApplication.name} Approved`);
    setSelectedApplication(null);
  };

  const handleReject = () => {
    toast.error(`Application for ${selectedApplication.name} Rejected`);
    setSelectedApplication(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Reviews</h1>
            <p className="text-gray-500">Review and approve customer identity verifications.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline">Export List</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      {app.type === 'Corporate' ? <Building className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{app.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{app.type} Account</span>
                        <span>•</span>
                        <span>Submitted {app.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">Pending Review</Badge>
                    <Button onClick={() => setSelectedApplication(app)}>
                      Review Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>KYC Application Review</DialogTitle>
              <DialogDescription>
                Review documents for {selectedApplication?.name} ({selectedApplication?.type} Account)
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h4 className="font-medium border-b pb-2">Applicant Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium">{selectedApplication?.name}</span>
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">user@{selectedApplication?.name.replace(/\s+/g, '').toLowerCase()}.com</span>
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-medium">{selectedApplication?.date}</span>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-medium border-b pb-2">Submitted Documents</h4>
                 <div className="space-y-2">
                    {selectedApplication && Object.keys(selectedApplication.documents).map((key) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium capitalize">{key}</span>
                        </div>
                        <div className="flex gap-2">
                           <Button size="icon" variant="ghost" className="h-6 w-6"><Eye className="w-3 h-3" /></Button>
                           <Button size="icon" variant="ghost" className="h-6 w-6"><Download className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="destructive" onClick={handleReject}>
                <XCircle className="w-4 h-4 mr-2" /> Reject Application
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}