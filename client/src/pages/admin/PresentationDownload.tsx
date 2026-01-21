import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Presentation, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from './AdminLayout';

export default function PresentationDownload() {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/admin/presentation/download', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate presentation');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Finatrades_Government_Presentation.pptx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Complete',
        description: 'Your presentation has been downloaded successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download presentation',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Official Presentation</h1>
          <p className="text-gray-600 mt-2">Download the Finatrades presentation for government and partner meetings</p>
        </div>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Presentation className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Government Partnership Presentation</CardTitle>
                <CardDescription>Professional PowerPoint presentation for ministry meetings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Presentation Contents:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Executive Summary
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Platform Services Overview
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Security & Compliance Features
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Technology Architecture
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Partnership Benefits
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Gold Flow & Treasury Management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Roadmap & Future Development
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Next Steps & Contact
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">File Details:</h3>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Format:</span>
                      <span className="font-medium">PowerPoint (.pptx)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Slides:</span>
                      <span className="font-medium">9 slides</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Theme:</span>
                      <span className="font-medium">Finatrades Purple</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Purpose:</span>
                      <span className="font-medium">Partnership Proposal</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
                  size="lg"
                  data-testid="download-presentation-btn"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Presentation...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-5 h-5 mr-2" />
                      Download Presentation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
