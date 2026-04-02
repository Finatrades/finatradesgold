import React from 'react';

type ChallengeState = 'idle' | 'blink' | 'mouth';

const AvatarSVG = ({ state }: { state: ChallengeState }) => {
  const isBlink = state === 'blink';
  const isMouth = state === 'mouth';

  return (
    <svg
      viewBox="0 0 260 300"
      width="100%"
      height="100%"
      className="max-w-[170px] drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] relative z-10"
      aria-hidden
    >
      <defs>
        {/* Skin — pale slightly cooler tone */}
        <radialGradient id="fb-skin" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#f5ebeb" />
          <stop offset="35%" stopColor="#e3ccce" />
          <stop offset="75%" stopColor="#cfaab0" />
          <stop offset="100%" stopColor="#b38790" />
        </radialGradient>
        
        {/* Face edge vignette */}
        <radialGradient id="fb-vignette" cx="50%" cy="52%" r="50%">
          <stop offset="58%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(40, 20, 60, 0.3)" />
        </radialGradient>

        <radialGradient id="fb-ear" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e3ccce" />
          <stop offset="100%" stopColor="#c0949d" />
        </radialGradient>

        {/* Hair — dark with subtle blue-purple metallic sheen */}
        <linearGradient id="fb-hair-base" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#251a2a" />
          <stop offset="45%" stopColor="#1a1020" />
          <stop offset="100%" stopColor="#0d0812" />
        </linearGradient>
        
        <linearGradient id="fb-hair-sheen" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(120, 80, 200, 0.4)" />
          <stop offset="100%" stopColor="rgba(120, 80, 200, 0)" />
        </linearGradient>

        {/* Eyes — vivid purple/violet iris eyes with glowing catchlight */}
        <radialGradient id="fb-iris" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>

        {/* Shirt — geometric collar in deep violet/purple */}
        <linearGradient id="fb-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>

        <linearGradient id="fb-collar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7e22ce" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>

        <radialGradient id="fb-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 100, 150, 0.15)" />
          <stop offset="100%" stopColor="rgba(200, 100, 150, 0)" />
        </radialGradient>

        <linearGradient id="fb-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbbcc1" />
          <stop offset="100%" stopColor="#ba8d95" />
        </linearGradient>

        <radialGradient id="fb-gloss" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes fb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
        .fb-body { animation: ${state === 'idle' ? 'fb-breathe 3s ease-in-out infinite' : 'none'}; transform-origin: 130px 150px; }
      `}</style>

      <g className="fb-body">
        {/* Shirt */}
        <ellipse cx="130" cy="294" rx="88" ry="42" fill="url(#fb-shirt)" />
        <path d="M 60 268 Q 130 256 200 268 L 218 300 L 42 300 Z" fill="url(#fb-shirt)" />
        
        {/* Collar - geometric */}
        <path d="M 80 255 L 130 280 L 180 255 L 150 290 L 130 300 L 110 290 Z" fill="url(#fb-collar)" />
        <path d="M 80 255 L 130 280 L 180 255" stroke="#a855f7" strokeWidth="2" fill="none" />

        {/* Neck */}
        <ellipse cx="130" cy="252" rx="30" ry="22" fill="url(#fb-neck)" />

        {/* Left ear */}
        <ellipse cx="38" cy="158" rx="19" ry="24" fill="url(#fb-ear)" />
        <ellipse cx="42" cy="158" rx="12" ry="16" fill="#cfaab0" opacity="0.7" />
        <ellipse cx="42" cy="158" rx="6" ry="9" fill="#b38790" opacity="0.5" />

        {/* Right ear */}
        <ellipse cx="222" cy="158" rx="19" ry="24" fill="url(#fb-ear)" />
        <ellipse cx="218" cy="158" rx="12" ry="16" fill="#cfaab0" opacity="0.7" />
        <ellipse cx="218" cy="158" rx="6" ry="9" fill="#b38790" opacity="0.5" />

        {/* Hair back */}
        <ellipse cx="130" cy="98" rx="90" ry="72" fill="#0d0812" />

        {/* Face oval */}
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#fb-skin)" />
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#fb-vignette)" />

        {/* Hair front */}
        <path d="M 42 120 Q 44 52 130 40 Q 216 52 218 120 Q 195 72 155 60 Q 130 52 108 58 Q 72 64 42 120 Z" fill="url(#fb-hair-base)" />
        <path d="M 42 120 Q 48 80 80 65 Q 60 90 55 118 Z" fill="#0d0812" />
        <path d="M 218 120 Q 210 78 172 60 Q 196 80 202 118 Z" fill="#0d0812" />
        <path d="M 60 100 Q 90 48 130 40 Q 170 48 200 100 Q 175 62 130 55 Q 85 62 60 100 Z" fill="url(#fb-hair-sheen)" />
        
        {/* Hair highlight */}
        <ellipse cx="108" cy="62" rx="22" ry="8" fill="rgba(200,180,255,0.2)" transform="rotate(-18 108 62)" />

        {/* Forehead gloss */}
        <ellipse cx="112" cy="100" rx="34" ry="20" fill="url(#fb-gloss)" transform="rotate(-12 112 100)" />

        {/* Eyebrows - more geometric */}
        <g transform={isBlink ? "translate(0, -4)" : ""}>
          <path d="M 80 118 L 100 112 L 118 115" stroke="#1a1020" strokeWidth="5" fill="none" strokeLinejoin="bevel" />
          <path d="M 142 115 L 160 112 L 180 118" stroke="#1a1020" strokeWidth="5" fill="none" strokeLinejoin="bevel" />
        </g>

        {/* Left eye */}
        <circle cx="103" cy="140" r="26" fill="white" />
        <circle cx="103" cy="142" r="18" fill="url(#fb-iris)" />
        <circle cx="103" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="110" cy="134" r="8" fill="rgba(255,255,255,0.95)" filter="drop-shadow(0 0 4px rgba(255,255,255,0.8))" />
        <circle cx="97" cy="149" r="3" fill="rgba(255,255,255,0.6)" />
        <path d="M 78 138 Q 103 122 128 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="103" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#e3ccce" />

        {/* Right eye */}
        <circle cx="157" cy="140" r="26" fill="white" />
        <circle cx="157" cy="142" r="18" fill="url(#fb-iris)" />
        <circle cx="157" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="164" cy="134" r="8" fill="rgba(255,255,255,0.95)" filter="drop-shadow(0 0 4px rgba(255,255,255,0.8))" />
        <circle cx="151" cy="149" r="3" fill="rgba(255,255,255,0.6)" />
        <path d="M 132 138 Q 157 122 182 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="157" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#e3ccce" />

        {/* Under-eye shadow */}
        <ellipse cx="103" cy="164" rx="22" ry="7" fill="rgba(100,50,80,0.1)" />
        <ellipse cx="157" cy="164" rx="22" ry="7" fill="rgba(100,50,80,0.1)" />

        {/* Cheek blush */}
        <ellipse cx="66" cy="178" rx="30" ry="18" fill="url(#fb-blush)" />
        <ellipse cx="194" cy="178" rx="30" ry="18" fill="url(#fb-blush)" />

        {/* Nose */}
        <path d="M 130 170 Q 122 184 116 190 Q 130 196 144 190 Q 138 184 130 170 Z" fill="rgba(150,80,100,0.12)" />
        <ellipse cx="118" cy="188" rx="7" ry="5" fill="rgba(120,60,80,0.2)" transform="rotate(-8 118 188)" />
        <ellipse cx="142" cy="188" rx="7" ry="5" fill="rgba(120,60,80,0.2)" transform="rotate(8 142 188)" />
        <ellipse cx="130" cy="178" rx="5" ry="8" fill="rgba(255,255,255,0.2)" />

        {/* Mouth Group */}
        <g transform={isMouth ? "translate(0, 7) scale(1, 1.6)" : "translate(0,0) scale(1,1)"} transform-origin="130 196">
          {/* Upper lip */}
          <path d="M 106 200 Q 118 194 130 197 Q 142 194 154 200 Q 142 207 130 205 Q 118 207 106 200 Z" fill="#914d5d" />
          <path d="M 114 196 Q 130 191 146 196" stroke="rgba(255,200,220,0.4)" strokeWidth="1.5" fill="none" />

          {/* Neutral closed */}
          {!isMouth && (
            <path d="M 106 200 Q 130 216 154 200 Q 150 210 130 212 Q 110 210 106 200 Z" fill="#9e5264" opacity="0.9" />
          )}

          {/* Mouth open */}
          {isMouth && (
            <g>
              <ellipse cx="130" cy="208" rx="22" ry="16" fill="#2d0014" />
              <ellipse cx="130" cy="216" rx="14" ry="8" fill="#a15871" opacity="0.85" />
              <ellipse cx="130" cy="203" rx="18" ry="6" fill="white" opacity="0.92" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
};

export default function FuturisticBiometric() {
  return (
    <div className="min-h-screen bg-[#09090f] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a0533] via-[#09090f] to-[#09090f] flex flex-col items-center justify-center p-8 font-sans text-white overflow-hidden relative">
      
      <div className="max-w-5xl w-full relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
            <span className="text-purple-400 font-mono text-sm tracking-widest uppercase">Biometric Link Active</span>
          </div>
          <h1 className="text-3xl font-light tracking-wide text-white mb-2">Subject Verification</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: 'idle', label: 'Idle', state: 'idle' as ChallengeState },
            { id: 'blink', label: 'Blink', state: 'blink' as ChallengeState },
            { id: 'mouth', label: 'Mouth Open', state: 'mouth' as ChallengeState },
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center group">
              <div className="relative w-full aspect-[4/5] flex items-center justify-center">
                {/* Outer glowing border card */}
                <div className="absolute inset-0 bg-[#150a21]/60 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.15)] overflow-hidden">
                  
                  {/* Scan line effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent h-32 w-full animate-[scan_3s_ease-in-out_infinite]" 
                       style={{ animation: 'scan 4s linear infinite' }} />

                  {/* SVG filter for scan animation */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scan {
                      0% { transform: translateY(-100%); }
                      100% { transform: translateY(400%); }
                    }
                    @keyframes spin-slow {
                      100% { transform: rotate(360deg); }
                    }
                  `}} />
                </div>

                {/* Animated spinning dashed ring */}
                <div className="absolute w-[220px] h-[220px] rounded-full border-2 border-dashed border-purple-500/40 animate-[spin-slow_12s_linear_infinite] before:absolute before:inset-0 before:rounded-full before:border-t-2 before:border-r-2 before:border-purple-400/80 before:animate-[spin-slow_4s_linear_infinite]" />
                
                {/* Inner solid ring */}
                <div className="absolute w-[200px] h-[200px] rounded-full border border-purple-400/20" />

                <AvatarSVG state={item.state} />
              </div>
              
              <div className="mt-8 bg-[#1a0b2e] border border-purple-500/40 px-8 py-2 rounded shadow-[0_0_15px_rgba(168,85,247,0.3)] relative">
                <div className="absolute top-0 left-0 w-2 h-[1px] bg-purple-400" />
                <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-purple-400" />
                <span className="text-purple-300 font-mono text-xs uppercase tracking-[0.2em]">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
