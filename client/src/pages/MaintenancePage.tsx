import { Wrench, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MaintenancePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center shadow-2xl border border-white/20">
        <div className="w-20 h-20 bg-purple-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-10 h-10 text-purple-200 animate-pulse" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Under Maintenance
        </h1>
        
        <p className="text-purple-200 mb-6 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience. 
          Please check back shortly.
        </p>
        
        <div className="bg-purple-950/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-300">
            If you're an administrator, please log in to access the platform.
          </p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button 
            onClick={handleRefresh}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/admin/login'}
            className="border-purple-400 text-purple-200 hover:bg-purple-800"
            data-testid="button-admin-login"
          >
            Admin Login
          </Button>
        </div>
        
        <p className="text-purple-400 text-xs mt-8">
          Finatrades - Gold-Backed Digital Finance
        </p>
      </div>
    </div>
  );
}
