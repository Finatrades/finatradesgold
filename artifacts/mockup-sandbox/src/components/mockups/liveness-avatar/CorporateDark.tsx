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
      className="max-w-[170px] drop-shadow-xl"
      aria-hidden
    >
      <defs>
        {/* Skin — confident warm beige with cool edge shadows */}
        <radialGradient id="cd-skin" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#f5d0b5" />
          <stop offset="35%" stopColor="#e8b898" />
          <stop offset="75%" stopColor="#d19c78" />
          <stop offset="100%" stopColor="#b5825d" />
        </radialGradient>
        
        {/* Face edge vignette */}
        <radialGradient id="cd-vignette" cx="50%" cy="52%" r="50%">
          <stop offset="58%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(40, 50, 70, 0.4)" />
        </radialGradient>

        <radialGradient id="cd-ear" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e8b898" />
          <stop offset="100%" stopColor="#c58f68" />
        </radialGradient>

        {/* Hair — sharp dark brown */}
        <linearGradient id="cd-hair-base" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#3a2820" />
          <stop offset="45%" stopColor="#251812" />
          <stop offset="100%" stopColor="#150d0a" />
        </linearGradient>
        
        <linearGradient id="cd-hair-sheen" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(80, 90, 110, 0.4)" />
          <stop offset="100%" stopColor="rgba(80, 90, 110, 0)" />
        </linearGradient>

        {/* Eyes — steel blue/indigo iris */}
        <radialGradient id="cd-iris" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#6b8cae" />
          <stop offset="50%" stopColor="#3d5a80" />
          <stop offset="100%" stopColor="#1e325c" />
        </radialGradient>

        {/* Shirt — charcoal/navy business */}
        <linearGradient id="cd-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c3e50" />
          <stop offset="100%" stopColor="#1a252f" />
        </linearGradient>

        <linearGradient id="cd-collar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </linearGradient>

        <radialGradient id="cd-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 100, 80, 0.15)" />
          <stop offset="100%" stopColor="rgba(200, 100, 80, 0)" />
        </radialGradient>

        <linearGradient id="cd-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbac8a" />
          <stop offset="100%" stopColor="#b8835f" />
        </linearGradient>

        <radialGradient id="cd-gloss" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes cd-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
        .cd-body { animation: ${state === 'idle' ? 'cd-breathe 3s ease-in-out infinite' : 'none'}; transform-origin: 130px 150px; }
      `}</style>

      <g className="cd-body">
        {/* Shirt */}
        <ellipse cx="130" cy="294" rx="88" ry="42" fill="url(#cd-shirt)" />
        <path d="M 60 268 Q 130 256 200 268 L 218 300 L 42 300 Z" fill="url(#cd-shirt)" />
        
        {/* Collar */}
        <path d="M 92 260 Q 130 252 168 260 Q 148 270 130 276 Q 112 270 92 260 Z" fill="url(#cd-collar)" />
        <path d="M 130 276 L 130 300" stroke="#d0d0d0" strokeWidth="2" />
        <path d="M 110 265 L 130 290 L 150 265" stroke="#d0d0d0" strokeWidth="2" fill="none" />

        {/* Neck */}
        <ellipse cx="130" cy="252" rx="30" ry="22" fill="url(#cd-neck)" />

        {/* Left ear */}
        <ellipse cx="38" cy="158" rx="19" ry="24" fill="url(#cd-ear)" />
        <ellipse cx="42" cy="158" rx="12" ry="16" fill="#d19c78" opacity="0.7" />
        <ellipse cx="42" cy="158" rx="6" ry="9" fill="#b5825d" opacity="0.5" />

        {/* Right ear */}
        <ellipse cx="222" cy="158" rx="19" ry="24" fill="url(#cd-ear)" />
        <ellipse cx="218" cy="158" rx="12" ry="16" fill="#d19c78" opacity="0.7" />
        <ellipse cx="218" cy="158" rx="6" ry="9" fill="#b5825d" opacity="0.5" />

        {/* Hair back */}
        <ellipse cx="130" cy="98" rx="90" ry="72" fill="#150d0a" />

        {/* Face oval */}
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#cd-skin)" />
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#cd-vignette)" />

        {/* Hair front */}
        <path d="M 42 120 Q 44 52 130 40 Q 216 52 218 120 Q 195 72 155 60 Q 130 52 108 58 Q 72 64 42 120 Z" fill="url(#cd-hair-base)" />
        <path d="M 42 120 Q 48 80 80 65 Q 60 90 55 118 Z" fill="#150d0a" />
        <path d="M 218 120 Q 210 78 172 60 Q 196 80 202 118 Z" fill="#150d0a" />
        <path d="M 60 100 Q 90 48 130 40 Q 170 48 200 100 Q 175 62 130 55 Q 85 62 60 100 Z" fill="url(#cd-hair-sheen)" />
        
        {/* Hair highlight */}
        <ellipse cx="108" cy="62" rx="22" ry="8" fill="rgba(255,255,255,0.1)" transform="rotate(-18 108 62)" />

        {/* Forehead gloss */}
        <ellipse cx="112" cy="100" rx="34" ry="20" fill="url(#cd-gloss)" transform="rotate(-12 112 100)" />

        {/* Eyebrows */}
        <g transform={isBlink ? "translate(0, -4)" : ""}>
          <path d="M 80 118 Q 100 110 118 115" stroke="#251812" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 142 115 Q 160 110 180 118" stroke="#251812" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>

        {/* Left eye */}
        <circle cx="103" cy="140" r="26" fill="white" />
        <circle cx="103" cy="142" r="18" fill="url(#cd-iris)" />
        <circle cx="103" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="110" cy="134" r="8" fill="rgba(255,255,255,0.92)" />
        <circle cx="97" cy="149" r="3" fill="rgba(255,255,255,0.50)" />
        <path d="M 78 138 Q 103 122 128 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="103" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#e8b898" />

        {/* Right eye */}
        <circle cx="157" cy="140" r="26" fill="white" />
        <circle cx="157" cy="142" r="18" fill="url(#cd-iris)" />
        <circle cx="157" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="164" cy="134" r="8" fill="rgba(255,255,255,0.92)" />
        <circle cx="151" cy="149" r="3" fill="rgba(255,255,255,0.50)" />
        <path d="M 132 138 Q 157 122 182 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="157" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#e8b898" />

        {/* Under-eye shadow */}
        <ellipse cx="103" cy="164" rx="22" ry="7" fill="rgba(100,50,30,0.1)" />
        <ellipse cx="157" cy="164" rx="22" ry="7" fill="rgba(100,50,30,0.1)" />

        {/* Cheek blush */}
        <ellipse cx="66" cy="178" rx="30" ry="18" fill="url(#cd-blush)" />
        <ellipse cx="194" cy="178" rx="30" ry="18" fill="url(#cd-blush)" />

        {/* Nose */}
        <path d="M 130 170 Q 122 184 116 190 Q 130 196 144 190 Q 138 184 130 170 Z" fill="rgba(150,80,50,0.15)" />
        <ellipse cx="118" cy="188" rx="7" ry="5" fill="rgba(120,60,30,0.2)" transform="rotate(-8 118 188)" />
        <ellipse cx="142" cy="188" rx="7" ry="5" fill="rgba(120,60,30,0.2)" transform="rotate(8 142 188)" />
        <ellipse cx="130" cy="178" rx="5" ry="8" fill="rgba(255,255,255,0.2)" />

        {/* Mouth Group */}
        <g transform={isMouth ? "translate(0, 7) scale(1, 1.6)" : "translate(0,0) scale(1,1)"} transform-origin="130 196">
          {/* Upper lip */}
          <path d="M 106 200 Q 118 194 130 197 Q 142 194 154 200 Q 142 207 130 205 Q 118 207 106 200 Z" fill="#a85565" />
          <path d="M 114 196 Q 130 191 146 196" stroke="rgba(255,200,210,0.4)" strokeWidth="1.5" fill="none" />

          {/* Neutral closed */}
          {!isMouth && (
            <path d="M 106 200 Q 130 216 154 200 Q 150 210 130 212 Q 110 210 106 200 Z" fill="#b86075" opacity="0.9" />
          )}

          {/* Mouth open */}
          {isMouth && (
            <g>
              <ellipse cx="130" cy="208" rx="22" ry="16" fill="#3d0018" />
              <ellipse cx="130" cy="216" rx="14" ry="8" fill="#c46282" opacity="0.85" />
              <ellipse cx="130" cy="203" rx="18" ry="6" fill="white" opacity="0.92" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
};

export default function CorporateDark() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Identity Verification</h1>
          <p className="text-slate-400">Please follow the guide on screen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: 'idle', label: 'Idle', state: 'idle' as ChallengeState },
            { id: 'blink', label: 'Blink', state: 'blink' as ChallengeState },
            { id: 'mouth', label: 'Mouth Open', state: 'mouth' as ChallengeState },
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              <div className="bg-[#1e293b]/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center w-full aspect-[4/5] relative overflow-hidden">
                <AvatarSVG state={item.state} />
              </div>
              <div className="mt-6 bg-slate-800/80 border border-slate-700 px-6 py-2 rounded-full shadow-lg">
                <span className="text-slate-300 font-medium tracking-wide text-sm uppercase tracking-wider">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
