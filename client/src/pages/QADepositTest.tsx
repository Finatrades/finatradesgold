import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Play, Check, X, Building, CreditCard, Bitcoin,
  FileText, Mail, Download, AlertCircle, ChevronRight, RefreshCw
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type TestMethod = 'bank' | 'crypto' | 'card';
type TestStep = 'method' | 'amount' | 'confirm' | 'approve' | 'execute';

interface TestResult {
  status: string;
  requestId: string;
  transactionId?: string;
  vaultHoldingId?: string;
  certificates?: {
    ownership?: string;
    storage?: string;
    invoice?: string;
  };
  balances?: {
    goldGrams: string;
    usdBalance: string;
  };
  goldReceived?: string;
  goldPrice?: string;
  method?: string;
  email?: string;
  logs?: any[];
  message?: string;
  code?: string;
}

const TEST_CASES = [
  { method: 'bank' as TestMethod, amount: 1000, label: 'Bank $1,000' },
  { method: 'crypto' as TestMethod, amount: 3000, label: 'Crypto $3,000' },
  { method: 'card' as TestMethod, amount: 5000, label: 'Card $5,000' },
];

export default function QADepositTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<TestStep>('method');
  const [method, setMethod] = useState<TestMethod | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [testEmail] = useState('leagal@finatrades.com');
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);

  const { data: config } = useQuery({
    queryKey: ['/api/qa/config'],
    queryFn: async () => {
      const res = await fetch('/api/qa/config', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load config');
      return res.json();
    },
  });

  const limits = config?.limits || { minDeposit: 50, maxDeposit: 100000 };

  useEffect(() => {
    if (!socket) return;

    const handleLedgerSync = (data: any) => {
      console.log('[QA] Ledger sync event:', data);
      setRealtimeEvents(prev => [...prev, { type: 'ledger:sync', data, ts: new Date().toISOString() }]);
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Real-time Update",
        description: `Balance updated: ${data.goldGrams || 'unknown'}g gold`,
      });
    };

    const handleBalanceUpdate = (data: any) => {
      console.log('[QA] Balance update event:', data);
      setRealtimeEvents(prev => [...prev, { type: 'balance_update', data, ts: new Date().toISOString() }]);
    };

    socket.on('ledger:sync', handleLedgerSync);
    socket.on('balance_update', handleBalanceUpdate);

    return () => {
      socket.off('ledger:sync', handleLedgerSync);
      socket.off('balance_update', handleBalanceUpdate);
    };
  }, [socket, queryClient, toast]);

  const resetTest = () => {
    setStep('method');
    setMethod(null);
    setAmount('');
    setResult(null);
  };

  const runTest = async (approve: boolean) => {
    if (!method || !amount) return;

    setIsRunning(true);
    setStep('execute');

    try {
      const res = await fetch('/api/qa/deposit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: testEmail,
          method,
          amountUsd: parseFloat(amount),
          approve,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.status === 'CONFIRMED') {
        toast({
          title: "Deposit Confirmed",
          description: `${data.goldReceived}g gold credited to wallet`,
        });
      } else if (data.status === 'DECLINED') {
        toast({
          title: "Deposit Declined",
          description: "Test was not approved",
          variant: "destructive",
        });
      } else if (data.code) {
        toast({
          title: "Validation Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "An error occurred running the test",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = (testCase: typeof TEST_CASES[0]) => {
    setMethod(testCase.method);
    setAmount(testCase.amount.toString());
    setStep('approve');
  };

  const isQaMode = config?.qaMode === true;
  const hasAccess = user?.role === 'admin' || isQaMode;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="h-6 w-6" />
              <p>Admin access or QA Mode required for testing</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="qa-title">
              QA Deposit Test Runner
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Automated end-to-end deposit testing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? "Socket Connected" : "Socket Disconnected"}
            </Badge>
            <Badge variant={config?.qaMode ? "default" : "secondary"}>
              {config?.qaMode ? "QA Mode Active" : "Production Mode"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {TEST_CASES.map((testCase) => (
            <Card 
              key={testCase.method}
              className="cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => runQuickTest(testCase)}
              data-testid={`quick-test-${testCase.method}`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {testCase.method === 'bank' && <Building className="h-5 w-5 text-blue-500" />}
                  {testCase.method === 'crypto' && <Bitcoin className="h-5 w-5 text-purple-500" />}
                  {testCase.method === 'card' && <CreditCard className="h-5 w-5 text-purple-500" />}
                  <div>
                    <p className="font-medium">{testCase.label}</p>
                    <p className="text-xs text-gray-500">Quick Test</p>
                  </div>
                  <Play className="h-4 w-4 ml-auto text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Wizard</CardTitle>
              <CardDescription>
                Step-by-step deposit test configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge variant={step === 'method' ? 'default' : 'outline'}>1. Method</Badge>
                <ChevronRight className="h-4 w-4" />
                <Badge variant={step === 'amount' ? 'default' : 'outline'}>2. Amount</Badge>
                <ChevronRight className="h-4 w-4" />
                <Badge variant={step === 'confirm' ? 'default' : 'outline'}>3. Confirm</Badge>
                <ChevronRight className="h-4 w-4" />
                <Badge variant={step === 'approve' ? 'default' : 'outline'}>4. Approve</Badge>
                <ChevronRight className="h-4 w-4" />
                <Badge variant={step === 'execute' ? 'default' : 'outline'}>5. Execute</Badge>
              </div>

              <Separator />

              {step === 'method' && (
                <div className="space-y-4">
                  <Label>Select Payment Method</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['bank', 'crypto', 'card'] as TestMethod[]).map((m) => (
                      <Button
                        key={m}
                        variant={method === m ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2"
                        onClick={() => {
                          setMethod(m);
                          setStep('amount');
                        }}
                        data-testid={`select-method-${m}`}
                      >
                        {m === 'bank' && <Building className="h-6 w-6" />}
                        {m === 'crypto' && <Bitcoin className="h-6 w-6" />}
                        {m === 'card' && <CreditCard className="h-6 w-6" />}
                        <span className="capitalize">{m}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'amount' && (
                <div className="space-y-4">
                  <Label>Enter Amount (USD)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-amount"
                  />
                  <p className="text-sm text-gray-500">
                    Min: ${limits.minDeposit} | Max: ${limits.maxDeposit.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('method')}>Back</Button>
                    <Button 
                      onClick={() => setStep('confirm')}
                      disabled={!amount || parseFloat(amount) < limits.minDeposit}
                      data-testid="btn-next-confirm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-4">
                  <Label>Confirm Test Details</Label>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{testEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method:</span>
                      <span className="font-medium capitalize">{method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-medium">${parseFloat(amount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('amount')}>Back</Button>
                    <Button onClick={() => setStep('approve')} data-testid="btn-confirm">
                      Confirm
                    </Button>
                  </div>
                </div>
              )}

              {step === 'approve' && (
                <div className="space-y-4">
                  <Label>Approval Decision</Label>
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Ready to execute {method?.toUpperCase()} deposit of ${parseFloat(amount || '0').toLocaleString()} for {testEmail}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => runTest(false)}
                      disabled={isRunning}
                      data-testid="btn-reject"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => runTest(true)}
                      disabled={isRunning}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="btn-approve"
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve & Execute
                    </Button>
                  </div>
                </div>
              )}

              {step === 'execute' && result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {result.status === 'CONFIRMED' ? (
                      <Badge className="bg-green-500">CONFIRMED</Badge>
                    ) : result.status === 'DECLINED' ? (
                      <Badge variant="destructive">DECLINED</Badge>
                    ) : (
                      <Badge variant="secondary">{result.status}</Badge>
                    )}
                  </div>

                  {result.status === 'CONFIRMED' && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transaction ID:</span>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {result.transactionId?.substring(0, 20)}...
                        </code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Gold Received:</span>
                        <span className="font-bold text-green-600">{result.goldReceived}g</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Gold Price:</span>
                        <span>${result.goldPrice}/g</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>New Balance:</span>
                        <span>{result.balances?.goldGrams}g</span>
                      </div>
                    </div>
                  )}

                  {result.certificates && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" data-testid="btn-cert-ownership">
                        <FileText className="h-4 w-4 mr-2" />
                        Ownership
                      </Button>
                      <Button variant="outline" size="sm" data-testid="btn-cert-storage">
                        <FileText className="h-4 w-4 mr-2" />
                        Storage
                      </Button>
                      <Button variant="outline" size="sm" data-testid="btn-cert-invoice">
                        <FileText className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    </div>
                  )}

                  <Button onClick={resetTest} className="w-full" data-testid="btn-new-test">
                    Run New Test
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Test Logs
                {result?.logs && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(result.logs, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `qa-logs-${result.requestId}.json`;
                      a.click();
                    }}
                    data-testid="btn-download-logs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {result?.logs ? (
                  <div className="space-y-2 font-mono text-xs">
                    {result.logs.map((log: any, i: number) => (
                      <div 
                        key={i}
                        className={`p-2 rounded ${
                          log.event.includes('FAIL') || log.event.includes('ERROR')
                            ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : log.event.includes('CONFIRMED') || log.event.includes('PASS')
                            ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-bold">{log.event}</span>
                          <span className="text-gray-400">
                            {new Date(log.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        {Object.keys(log).filter(k => !['ts', 'level', 'requestId', 'event'].includes(k)).length > 0 && (
                          <pre className="mt-1 text-[10px] overflow-x-auto">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(log).filter(([k]) => !['ts', 'level', 'requestId', 'event'].includes(k))
                              ),
                              null,
                              2
                            )}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p>Run a test to see logs</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <p className="text-gray-500">Test User</p>
                <p className="font-medium">{testEmail}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <p className="text-gray-500">Min Deposit</p>
                <p className="font-medium">${limits.minDeposit}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <p className="text-gray-500">Max Deposit</p>
                <p className="font-medium">${limits.maxDeposit.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <p className="text-gray-500">QA Mode</p>
                <p className="font-medium">{config?.qaMode ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
