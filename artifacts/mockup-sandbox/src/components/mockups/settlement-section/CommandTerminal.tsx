import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  Lock, 
  Cpu,
  CreditCard,
  Warehouse,
  Handshake,
  Activity,
  ShieldCheck,
  History,
  AlertTriangle
} from 'lucide-react';

export function CommandTerminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  const asciiArt = `
███████╗██╗███╗   ██╗ █████╗ ████████╗██████╗  █████╗ ██████╗ ███████╗███████╗
██╔════╝██║████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝
█████╗  ██║██╔██╗ ██║███████║   ██║   ██████╔╝███████║██║  ██║█████╗  ███████╗
██╔══╝  ██║██║╚██╗██║██╔══██║   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ╚════██║
██║     ██║██║ ╚████║██║  ██║   ██║   ██║  ██║██║  ██║██████╔╝███████╗███████║
╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
                               SETTLEMENT PROTOCOL v2.3.1
  `;

  const lines: any[] = [
    { type: 'text', content: 'Initializing secure environment...', delay: 500 },
    { type: 'text', content: 'Establishing handshake with global clearing nodes...', delay: 800 },
    { type: 'success', content: '[OK] Connection established. Encryption: AES-256-GCM', delay: 400 },
    { type: 'text', content: 'Loading trade metadata: ID_SETL_772A_99XC', delay: 300 },
    { type: 'divider', content: '', delay: 200 },
    { type: 'header', content: 'RUNNING SETTLEMENT CONDITION CHECKS:', delay: 500 },
    { type: 'check', label: 'inventory_position', status: 'REQUIRED', result: 'FAILED', icon: '✗', msg: 'Transaction suspended — no sale initiated', delay: 1000 },
    { type: 'check', label: 'buyer_funds_verification', status: 'REQUIRED', result: 'PENDING', icon: '!', msg: 'Inventory lock withheld — no reservation', delay: 800 },
    { type: 'check', label: 'escrow_conditions', status: 'REQUIRED', result: 'BLOCKED', icon: '✗', msg: 'Warehouse release blocked — no dispatch', delay: 600 },
    { type: 'check', label: 'delivery_milestone', status: 'REQUIRED', result: 'DEFERRED', icon: '!', msg: 'Final payout deferred — funds held in escrow', delay: 700 },
    { type: 'check', label: 'trade_documentation', status: 'REQUIRED', result: 'VOID', icon: '✗', msg: 'Audit trail void — settlement rejected', delay: 900 },
    { type: 'divider', content: '', delay: 400 },
    { type: 'header', content: 'INITIATING PROTOCOL SEQUENCE...', delay: 1000 },
    { type: 'step', number: 1, icon: CreditCard, title: 'Buyer Fund Verification & Payment Confirmation', timestamp: '14:22:01.092', delay: 1200 },
    { type: 'step', number: 2, icon: Lock, title: 'Escrow Custody & Bilateral Lock Enforcement', timestamp: '14:22:01.441', delay: 1000 },
    { type: 'step', number: 3, icon: Warehouse, title: 'Conditional Warehouse Release Authorisation', timestamp: '14:22:02.112', delay: 1100 },
    { type: 'step', number: 4, icon: Handshake, title: 'Seller Disbursement & Immutable Audit Closure', timestamp: '14:22:02.890', delay: 1300 },
    { type: 'divider', content: '', delay: 500 },
    { type: 'footer', content: 'Awaiting clearance confirmation...', delay: 0 },
  ];

  useEffect(() => {
    if (visibleLines < lines.length) {
      const line = lines[visibleLines];
      const timer = setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, line.delay);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [visibleLines]);

  const getStatusColor = (result: string) => {
    switch (result) {
      case 'FAILED': return 'text-[#FF4444]';
      case 'BLOCKED': return 'text-[#FF4444]';
      case 'VOID': return 'text-[#FF4444]';
      case 'PENDING': return 'text-amber-500';
      case 'DEFERRED': return 'text-amber-500';
      default: return 'text-[#00FF41]';
    }
  };

  const StepIcon = (props: { icon: any }) => {
    const Icon = props.icon;
    return <Icon className="w-4 h-4 text-[#C73B22]" />;
  };

  return (
    <div className="min-h-screen w-full bg-[#0D1117] text-[#e6edf3] font-mono selection:bg-[#00FF41]/20 selection:text-[#00FF41] p-4 md:p-8 flex items-center justify-center overflow-hidden">
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 1s step-end infinite;
          }
          .scanlines {
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.05),
              rgba(0, 0, 0, 0.05) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
          }
          .terminal-window {
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .line-animate {
            animation: slideIn 0.2s ease-out forwards;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #0d1117;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #30363d;
            border-radius: 10px;
          }
        `}
      </style>

      <div className="max-w-7xl w-full h-[85vh] grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
        
        {/* Main Terminal Window */}
        <div className="lg:col-span-3 bg-[#010409] rounded-lg border border-[#30363d] flex flex-col overflow-hidden terminal-window relative">
          <div className="scanlines absolute inset-0 z-10"></div>
          
          {/* Terminal Top Bar */}
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
              </div>
              <div className="ml-4 flex items-center gap-2 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                <span>finatrades-settlement-protocol v2.3.1 — ACTIVE SESSION</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#8b949e]">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse"></div>
                LATENCY: 14ms
              </span>
              <span>PID: 88291</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-0">
            <pre className="text-[#8b949e] text-[10px] md:text-xs leading-none mb-8 opacity-80 whitespace-pre">
              {asciiArt}
            </pre>

            <div className="space-y-1.5 text-xs md:text-sm">
              {lines.slice(0, visibleLines).map((line, idx) => (
                <div key={idx} className="line-animate">
                  {line.type === 'text' && (
                    <div className="text-gray-400">
                      <span className="text-[#30363d] mr-2">❯</span>
                      {line.content}
                    </div>
                  )}
                  {line.type === 'success' && (
                    <div className="text-[#00FF41]">
                      <span className="text-[#30363d] mr-2">❯</span>
                      {line.content}
                    </div>
                  )}
                  {line.type === 'divider' && <div className="h-4"></div>}
                  {line.type === 'header' && (
                    <div className="text-white font-bold underline decoration-[#C73B22] underline-offset-4 mb-2">
                      {line.content}
                    </div>
                  )}
                  {line.type === 'check' && (
                    <div className="flex flex-wrap items-center gap-2 py-0.5">
                      <span className="text-[#8b949e]">[VERIFYING]</span>
                      <span className="text-white min-w-[180px]">{line.label}...</span>
                      <span className="text-[#8b949e]">STATUS:</span>
                      <span className="text-amber-500 font-bold">{line.status}</span>
                      <span className={getStatusColor(line.result)}>
                        {line.icon} {line.result}
                      </span>
                      <span className="text-[#30363d] mx-2">|</span>
                      <span className="text-[#8b949e] italic">{line.msg}</span>
                    </div>
                  )}
                  {line.type === 'step' && (
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded border border-white/5 my-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-[#161b22] border border-[#30363d] flex items-center justify-center">
                        {line.icon && <StepIcon icon={line.icon} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">{line.number}. {line.title}</span>
                          <span className="text-[10px] text-[#30363d] font-mono">{line.timestamp || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#00FF41]">
                          <Activity className="w-3 h-3" />
                          <span>EXECUTING SECURE HANDSHAKE...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {line.type === 'footer' && (
                    <div className="flex items-center gap-2 mt-4 text-[#00FF41]">
                      <span className="text-white mr-2">❯</span>
                      {line.content}
                      <span className="w-2 h-4 bg-[#00FF41] animate-blink inline-block"></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Status Panel */}
        <div className="bg-[#0d1117] flex flex-col gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#C73B22]" />
                Protocol State
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white uppercase">Operational</span>
                <span className="px-2 py-0.5 rounded bg-[#00FF41]/10 text-[#00FF41] text-[10px] font-bold border border-[#00FF41]/20 uppercase">
                  ACTIVE
                </span>
              </div>
              <div className="mt-3 w-full bg-[#30363d] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#C73B22] h-full w-2/3 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#010409] border border-[#30363d] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#00FF41]" />
                </div>
                <div>
                  <div className="text-[9px] text-[#8b949e] uppercase font-bold">Escrow Status</div>
                  <div className="text-xs font-bold text-white">PROTECTED</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#010409] border border-[#30363d] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-[9px] text-[#8b949e] uppercase font-bold">Inventory Lock</div>
                  <div className="text-xs font-bold text-white">BNSL-ENFORCED</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#010409] border border-[#30363d] flex items-center justify-center">
                  <History className="w-5 h-5 text-[#8b949e]" />
                </div>
                <div>
                  <div className="text-[9px] text-[#8b949e] uppercase font-bold">Audit Hash</div>
                  <div className="text-[10px] font-mono text-white truncate w-32">0x7A2B...4F2E</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 border-l-4 border-l-[#C73B22]">
            <h4 className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Safety Trigger
            </h4>
            <p className="text-[11px] text-[#8b949e] leading-relaxed">
              Bilateral security protocol is engaged. Any manual override requires triple-signature clearance from clearing house.
            </p>
          </div>

          <div className="mt-auto pt-4 flex items-center justify-center gap-4 text-[#30363d]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#1A1A1A] flex items-center justify-center rounded-sm border border-[#30363d]">
                <div className="w-2.5 h-2.5 border-t border-r border-[#C73B22]"></div>
              </div>
              <span className="text-xs font-black tracking-tighter">FINATRADES<span className="text-[#C73B22]">.</span></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
