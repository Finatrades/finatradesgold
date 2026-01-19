import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Box, FileText } from 'lucide-react';
import { Link } from 'wouter';

interface Certificate {
  id: string;
  certificateNumber: string;
  type: string;
  status: string;
  goldGrams: string;
  issuer: string;
  issuedAt: string;
  goldWalletType?: 'LGPW' | 'FGPW' | null;
  fromGoldWalletType?: 'LGPW' | 'FGPW' | null;
  toGoldWalletType?: 'LGPW' | 'FGPW' | null;
}

interface CertificatesCardProps {
  certificates?: Certificate[];
  isLoading?: boolean;
}

export default function CertificatesCard({ certificates = [], isLoading = false }: CertificatesCardProps) {
  const recentCertificates = Array.isArray(certificates) ? certificates.slice(0, 5) : [];

  return (
    <Card className="p-5 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)] hover:border-purple-300 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Certificates</h3>
        <Link href="/finavault">
          <Button variant="ghost" size="sm" className="text-purple-600 text-xs h-7 px-2">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : recentCertificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No certificates yet</p>
          </div>
        ) : (
          recentCertificates.map((cert: Certificate) => {
            const isDigital = cert.type !== 'Physical Storage';
            const goldGrams = parseFloat(cert.goldGrams || '0');
            const issueDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={cert.id}
                className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                data-testid={`certificate-row-${cert.id}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isDigital ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  {isDigital ? (
                    <Award className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Box className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {cert.type}
                  </p>
                  <p className="text-xs text-gray-500">{issueDate}</p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{goldGrams.toFixed(2)}g</p>
                </div>
                
                <div className="shrink-0 ml-2">
                  <Badge 
                    className={`text-xs border-0 ${
                      cert.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cert.status}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
