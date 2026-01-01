import React from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Settings, DollarSign, Shield, CreditCard, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'wouter';

export default function AdminSettings() {
  const { user } = useAuth();

  const handleDownloadAdminManual = async () => {
    try {
      const response = await fetch('/api/documents/admin-manual', {
        credentials: 'include',
        headers: { 'X-Admin-User-Id': user?.id || '' }
      });
      if (!response.ok) {
        throw new Error('Failed to download manual');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Finatrades-Admin-Manual.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Admin Manual downloaded');
    } catch (error) {
      toast.error('Failed to download admin manual');
    }
  };

  const configLinks = [
    {
      title: 'Platform Configuration',
      description: 'Gold pricing, transaction limits, deposit/withdrawal settings, BNSL, and more',
      icon: Settings,
      href: '/admin/platform-config',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'Fee Management',
      description: 'Manage fees for FinaPay, FinaVault, BNSL, and FinaBridge modules',
      icon: DollarSign,
      href: '/admin/fees',
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Payment Gateways',
      description: 'Configure Stripe, PayPal, Bank Transfer, Binance Pay, NGenius, and crypto wallets',
      icon: CreditCard,
      href: '/admin/payment-gateways',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Security Settings',
      description: 'OTP verification, passkeys, admin approval workflows',
      icon: Shield,
      href: '/admin/security',
      color: 'text-red-600 bg-red-100'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Resources</h1>
          <p className="text-gray-500">Quick access to configuration pages and admin documentation.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" /> Admin Documentation
            </CardTitle>
            <CardDescription>Download the comprehensive admin panel manual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Admin Panel Manual</p>
                  <p className="text-sm text-gray-500">Comprehensive guide for platform administrators</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                data-testid="button-download-admin-manual"
                onClick={handleDownloadAdminManual}
              >
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${link.color}`}>
                        <link.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{link.title}</h3>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{link.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-amber-900">Configuration Consolidated</h3>
                <p className="text-sm text-amber-700 mt-1">
                  All platform settings (pricing, limits, fees, payment methods) have been consolidated into 
                  <strong> Platform Configuration</strong> for centralized management. Use the quick links above to access specific settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
