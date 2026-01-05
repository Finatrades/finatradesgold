import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, RefreshCw, Download, Users, Beaker, Shield, CreditCard, FileCheck, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  suite: string;
  testName: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
}

interface LogEntry {
  ts: string;
  level: string;
  requestId: string;
  suite: string;
  testName: string;
  actorEmail?: string;
  actorRole?: string;
  event: string;
  details?: Record<string, any>;
  errorStack?: string;
}

interface TestAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  kycStatus: string;
  employeeRole: string | null;
  goldGrams: string;
  usdBalance: string;
}

export default function QATests() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tests");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [suiteFilter, setSuiteFilter] = useState("");
  const [testResults, setTestResults] = useState<TestSuiteResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const { data: accounts, refetch: refetchAccounts } = useQuery<any>({
    queryKey: ["/api/qa/tests/accounts"],
    queryFn: () => apiRequest("GET", "/api/qa/tests/accounts"),
    enabled: false,
  });

  const { data: logs, refetch: refetchLogs } = useQuery<any>({
    queryKey: ["/api/qa/logs", levelFilter, suiteFilter],
    queryFn: () => apiRequest("GET", `/api/qa/logs?level=${levelFilter}&suite=${suiteFilter}&count=200`),
    enabled: false,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/qa/tests/seed"),
    onSuccess: () => {
      refetchAccounts();
      refetchLogs();
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/qa/tests/reset"),
    onSuccess: () => {
      refetchAccounts();
      refetchLogs();
    },
  });

  const runTest = async (endpoint: string) => {
    setIsRunning(true);
    try {
      const result = await apiRequest("POST", endpoint) as any;
      if (result.suites) {
        setTestResults(result.suites);
      } else if (result.tests) {
        setTestResults([result]);
      }
      refetchLogs();
    } finally {
      setIsRunning(false);
    }
  };

  const exportLogs = async () => {
    window.open("/api/qa/logs/export", "_blank");
  };

  const exportReport = () => {
    window.open("/api/qa/report?format=html", "_blank");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl" data-testid="qa-tests-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Beaker className="h-8 w-8 text-purple-500" />
          QA Test Harness
        </h1>
        <p className="text-gray-600 mt-2">
          Automated testing system for Finatrades platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="tests" data-testid="tab-tests">Test Runner</TabsTrigger>
          <TabsTrigger value="accounts" data-testid="tab-accounts">Test Accounts</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Setup & Configuration</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                      variant="outline"
                      data-testid="btn-seed"
                    >
                      {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                      Seed Test Users
                    </Button>
                    <Button
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                      variant="outline"
                      data-testid="btn-reset"
                    >
                      {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Reset Test Data
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Seed test users and employees, or reset test data to clean state
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Suites</CardTitle>
                <CardDescription>Run automated tests against the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={() => runTest("/api/qa/tests/run/smoke")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    data-testid="btn-run-smoke"
                  >
                    <Play className="h-6 w-6" />
                    <span>Smoke Tests</span>
                  </Button>

                  <Button
                    onClick={() => runTest("/api/qa/tests/run/full")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="default"
                    data-testid="btn-run-full"
                  >
                    <Beaker className="h-6 w-6" />
                    <span>Full Regression</span>
                  </Button>

                  <Button
                    onClick={() => runTest("/api/qa/tests/run/auth")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                    data-testid="btn-run-auth"
                  >
                    <Shield className="h-6 w-6" />
                    <span>Auth Tests</span>
                  </Button>

                  <Button
                    onClick={() => runTest("/api/qa/tests/run/roles")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                    data-testid="btn-run-roles"
                  >
                    <Users className="h-6 w-6" />
                    <span>Role Tests</span>
                  </Button>

                  <Button
                    onClick={() => runTest("/api/qa/tests/run/kyc")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                    data-testid="btn-run-kyc"
                  >
                    <FileCheck className="h-6 w-6" />
                    <span>KYC Gate Tests</span>
                  </Button>

                  <Button
                    onClick={() => runTest("/api/qa/tests/run/deposits")}
                    disabled={isRunning}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                    data-testid="btn-run-deposits"
                  >
                    <CreditCard className="h-6 w-6" />
                    <span>Deposit Tests</span>
                  </Button>

                  <Button
                    onClick={exportReport}
                    variant="secondary"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    data-testid="btn-export-report"
                  >
                    <Download className="h-6 w-6" />
                    <span>Export Report</span>
                  </Button>
                </div>

                {isRunning && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-purple-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Running tests...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      Passed: {testResults.reduce((sum, s) => sum + s.passed, 0)}
                    </span>
                    <span className="text-red-600">
                      Failed: {testResults.reduce((sum, s) => sum + s.failed, 0)}
                    </span>
                    <span className="text-gray-500">
                      Total: {testResults.reduce((sum, s) => sum + s.total, 0)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {testResults.map((suite, idx) => (
                      <div key={idx} className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{suite.suite}</h3>
                          <Badge variant={suite.failed > 0 ? "destructive" : "default"}>
                            {suite.passed}/{suite.total} ({suite.duration}ms)
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {suite.tests.map((test, tidx) => (
                            <div
                              key={tidx}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                              data-testid={`test-result-${test.testName}`}
                            >
                              <span className="text-sm">{test.testName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{test.duration}ms</span>
                                {test.status === "pass" ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : test.status === "fail" ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Accounts</span>
                <Button onClick={() => refetchAccounts()} variant="outline" size="sm" data-testid="btn-refresh-accounts">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Default password for all test accounts: <code className="bg-gray-100 px-2 py-1 rounded">{accounts?.password || "Test123!@#"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts?.accounts && accounts.accounts.length > 0 ? (
                <div className="grid gap-4">
                  {accounts.accounts.map((account: TestAccount) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`account-${account.email}`}
                    >
                      <div>
                        <div className="font-medium">{account.email}</div>
                        <div className="text-sm text-gray-500">{account.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.kycStatus === "Approved" ? "default" : "secondary"}>
                          {account.kycStatus}
                        </Badge>
                        {account.employeeRole && (
                          <Badge variant="outline">{account.employeeRole}</Badge>
                        )}
                        <Badge variant="outline">{account.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test accounts found. Click "Seed Test Users" to create them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>QA Logs</span>
                <div className="flex gap-2">
                  <Button onClick={() => refetchLogs()} variant="outline" size="sm" data-testid="btn-refresh-logs">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={exportLogs} variant="outline" size="sm" data-testid="btn-export-logs">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                <div className="flex gap-4 mt-2">
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-32" data-testid="select-level">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warn</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Filter by suite..."
                    value={suiteFilter}
                    onChange={(e) => setSuiteFilter(e.target.value)}
                    className="w-48"
                    data-testid="input-suite-filter"
                  />
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {logs?.logs && logs.logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.logs.map((log: LogEntry, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded text-sm font-mono ${
                          log.level === "error"
                            ? "bg-red-50 border-l-4 border-red-500"
                            : log.level === "warn"
                            ? "bg-yellow-50 border-l-4 border-yellow-500"
                            : "bg-gray-50 border-l-4 border-gray-300"
                        }`}
                        data-testid={`log-entry-${idx}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{new Date(log.ts).toLocaleString()}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">{log.suite}</Badge>
                            <Badge variant="outline" className="text-xs">{log.level.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <div className="font-semibold">{log.event}</div>
                        {log.testName && <div className="text-gray-600">{log.testName}</div>}
                        {log.details && (
                          <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs found. Run some tests to generate logs.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
