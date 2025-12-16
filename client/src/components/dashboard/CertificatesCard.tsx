import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Box, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'wouter';

interface Certificate {
  id: string;
  certificateNumber: string;
  type: 'Digital Ownership' | 'Physical Storage';
  status: 'Active' | 'Updated' | 'Cancelled' | 'Transferred';
  goldGrams: string;
  issuer: string;
  issuedAt: string;
}

export default function CertificatesCard() {
  const { user } = useAuth();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/certificates/${user.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.certificates || [];
    },
    enabled: !!user?.id,
  });

  const recentCertificates = certificates.slice(0, 4);

  return (
    <Card className="p-6 bg-white border border-gray-100 shadow-sm h-[400px] flex flex-col rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Certificates</h3>
        <Link href="/finavault">
          <Button variant="link" className="text-orange-500 h-auto p-0 hover:text-orange-600" data-testid="link-view-all-certificates">
            View all
          </Button>
        </Link>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : recentCertificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No certificates yet</p>
            <p className="text-xs mt-1">Deposit gold to receive certificates</p>
          </div>
        ) : (
          recentCertificates.map((cert: Certificate) => {
            const isDigital = cert.type === 'Digital Ownership';
            const goldGrams = parseFloat(cert.goldGrams || '0');
            const issueDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={cert.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
                data-testid={`certificate-row-${cert.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDigital ? 'bg-amber-100' : 'bg-gray-200'
                  }`}>
                    {isDigital ? (
                      <Award className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Box className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {isDigital ? 'Digital Ownership' : 'Physical Storage'}
                    </p>
                    <p className="text-xs text-gray-500">{issueDate}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{goldGrams.toFixed(2)}g</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        cert.status === 'Active' 
                          ? 'bg-green-50 text-green-600 border-green-200' 
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {cert.status}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
