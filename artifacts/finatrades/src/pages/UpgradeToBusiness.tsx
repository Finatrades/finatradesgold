import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, ShieldCheck, TrendingUp, Globe, Users, FileText, BadgeCheck,
  ArrowRight, Check, Clock, Lock, Building2, Banknote, Receipt, IdCard,
  Sparkles, AlertCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export default function UpgradeToBusiness() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const isAlreadyBusiness = user?.accountType === 'business';

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      return apiRequest('PATCH', `/api/users/${user.id}`, { accountType: 'business' });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['/api/auth/me'] });
      if (refreshUser) await refreshUser();
      toast({
        title: 'Account switched to Business',
        description: 'Now complete your corporate KYC to unlock all Business features.',
      });
      navigate('/kyc');
    },
    onError: () => {
      toast({
        title: 'Could not switch account',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    },
  });

  const features = [
    { icon: Globe, label: 'FinaBridge Trade Finance', personal: false, business: true, note: 'Importer / Exporter dashboards' },
    { icon: TrendingUp, label: 'Higher BNSL position limits', personal: '500 g cap', business: 'Up to 50 kg', highlight: true },
    { icon: Banknote, label: 'Bulk gold redemption', personal: false, business: true, note: 'Direct vault delivery' },
    { icon: Users, label: 'Multi-user team access', personal: false, business: true, note: 'Trader + Finance roles' },
    { icon: Receipt, label: 'Consolidated tax invoices', personal: false, business: true, note: 'GST-compliant statements' },
    { icon: BadgeCheck, label: 'Dedicated relationship manager', personal: false, business: true },
    { icon: ShieldCheck, label: 'Settlement assurance backing', personal: 'Standard', business: 'Priority' },
    { icon: Sparkles, label: 'Personal gold wallet & FinaPay', personal: true, business: true },
  ];

  const requiredDocs = [
    { icon: Building2, title: 'Certificate of Incorporation', detail: 'Issued by registrar; clearly readable PDF or image' },
    { icon: FileText, title: 'Trade License', detail: 'Valid (not expired); will be tracked for renewal alerts' },
    { icon: FileText, title: 'Memorandum & Articles of Association', detail: 'Latest version with company objectives' },
    { icon: Users, title: 'Shareholder List & UBO Details', detail: 'All beneficial owners with ≥ 10% holding' },
    { icon: IdCard, title: 'UBO Passport / National ID', detail: 'For each declared beneficial owner' },
    { icon: Banknote, title: 'Bank Reference Letter', detail: 'Issued within last 90 days on bank letterhead' },
    { icon: BadgeCheck, title: 'Authorized Signatory ID', detail: 'Plus liveness check during submission' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* HERO */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(212,175,55,0.10) 55%, rgba(124,58,237,0.06) 100%)',
            border: '1px solid hsl(var(--border) / 0.6)',
          }}
          data-testid="hero-upgrade"
        >
          <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)' }} />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }} />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
            <div className="flex-1 max-w-2xl">
              <Badge variant="outline" className="mb-3 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 bg-violet-50/60 dark:bg-violet-950/30">
                <Briefcase className="w-3 h-3 mr-1.5" /> Business Account
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" data-testid="text-hero-title">
                Built for traders, importers & treasuries
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                Upgrade unlocks <span className="font-semibold text-foreground">FinaBridge trade finance</span>,
                higher BNSL limits, bulk redemption, and team access — all backed by FinaTrades&apos; Switzerland-grade
                settlement assurance. Verification is one corporate KYC submission.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-stretch gap-2 min-w-[260px]">
              {isAlreadyBusiness ? (
                <>
                  <Badge className="justify-center py-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Check className="w-3.5 h-3.5 mr-1.5" /> You&apos;re on Business
                  </Badge>
                  <Link href="/kyc">
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-amber-600 hover:opacity-95 text-white font-semibold" data-testid="button-go-to-kyc">
                      Continue Corporate KYC <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setConfirming(true)}
                    className="w-full bg-gradient-to-r from-violet-600 to-amber-600 hover:opacity-95 text-white font-semibold py-6 text-base shadow-lg shadow-violet-500/25"
                    data-testid="button-start-upgrade"
                  >
                    Start Business Verification <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Free upgrade • No charges to apply
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* COMPARISON */}
        <section data-testid="section-comparison">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-foreground">Personal vs Business — what changes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your existing wallet, gold, and history stay intact. Business simply adds capabilities on top.
            </p>
          </div>

          <Card>
            <CardContent className="p-0 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-6">Feature</div>
                <div className="col-span-3 text-center">Personal</div>
                <div className="col-span-3 text-center">Business</div>
              </div>
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className={`grid grid-cols-12 items-center px-5 py-4 ${i !== features.length - 1 ? 'border-b border-border/60' : ''} ${f.highlight ? 'bg-violet-50/40 dark:bg-violet-950/15' : ''}`}
                    data-testid={`row-feature-${i}`}
                  >
                    <div className="col-span-6 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{f.label}</p>
                        {f.note && <p className="text-xs text-muted-foreground mt-0.5">{f.note}</p>}
                      </div>
                    </div>
                    <div className="col-span-3 text-center">
                      <CellValue value={f.personal} />
                    </div>
                    <div className="col-span-3 text-center">
                      <CellValue value={f.business} accent />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* DOCUMENTS NEEDED */}
        <section data-testid="section-documents">
          <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                What you&apos;ll need to submit
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Keep these ready as PDFs or clear photos. You can save and resume the form anytime.
              </p>
            </div>
            <Badge variant="outline" className="text-xs gap-1.5">
              <Clock className="w-3 h-3" /> 10-15 min to complete
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requiredDocs.map((d, i) => {
              const Icon = d.icon;
              return (
                <Card key={d.title} data-testid={`doc-${i}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/15 to-amber-500/15 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-700 dark:text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{d.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{d.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section data-testid="section-how">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-foreground">How verification works</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Transparent timeline — most submissions are reviewed within 3 business days.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { n: '1', title: 'Switch to Business', desc: 'One click — your data stays safe.', icon: Briefcase },
              { n: '2', title: 'Submit corporate KYC', desc: 'Company, owners, banking, documents.', icon: FileText },
              { n: '3', title: 'Compliance review', desc: 'Our team verifies within 3-5 business days.', icon: ShieldCheck },
              { n: '4', title: 'Business unlocked', desc: 'FinaBridge, higher limits, team access.', icon: BadgeCheck },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.n}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[11px] font-bold flex items-center justify-center">{s.n}</span>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* TRUST FOOTER */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Bank-grade encryption & Swiss compliance</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All documents encrypted in transit & at rest. Reviewed only by FinaTrades compliance officers.
                </p>
              </div>
            </div>
            <Link href="/help">
              <Button variant="outline" size="sm" data-testid="button-help">Need help? Contact support</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* CONFIRM MODAL */}
      {confirming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="modal-confirm">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Switch to Business account?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your wallet, gold, and history stay safe. We&apos;ll move you to the corporate KYC form so you can submit company details.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirming(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={() => upgradeMutation.mutate()}
                  disabled={upgradeMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-amber-600 hover:opacity-95 text-white"
                  data-testid="button-confirm-upgrade"
                >
                  {upgradeMutation.isPending ? 'Switching…' : 'Yes, switch & continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

function CellValue({ value, accent = false }: { value: boolean | string; accent?: boolean }) {
  if (value === true) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${accent ? 'bg-violet-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'}`}>
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (value === false) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <span className={`text-xs font-semibold ${accent ? 'text-foreground' : 'text-muted-foreground'}`}>
      {value}
    </span>
  );
}
