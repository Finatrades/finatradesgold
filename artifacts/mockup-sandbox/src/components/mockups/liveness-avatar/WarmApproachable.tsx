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
        {/* Skin — warm peachy tan with golden highlights */}
        <radialGradient id="wa-skin" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fdf0e0" />
          <stop offset="35%" stopColor="#f7cdad" />
          <stop offset="75%" stopColor="#ebac80" />
          <stop offset="100%" stopColor="#cf8656" />
        </radialGradient>
        
        {/* Face edge vignette */}
        <radialGradient id="wa-vignette" cx="50%" cy="52%" r="50%">
          <stop offset="58%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(180, 80, 20, 0.2)" />
        </radialGradient>

        <radialGradient id="wa-ear" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f7cdad" />
          <stop offset="100%" stopColor="#d99966" />
        </radialGradient>

        {/* Hair — warm medium brown with amber highlights */}
        <linearGradient id="wa-hair-base" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#8a5a3a" />
          <stop offset="45%" stopColor="#6a3e20" />
          <stop offset="100%" stopColor="#4a2610" />
        </linearGradient>
        
        <linearGradient id="wa-hair-sheen" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="rgba(200, 140, 60, 0.3)" />
          <stop offset="100%" stopColor="rgba(200, 140, 60, 0)" />
        </linearGradient>

        {/* Eyes — bright forest green iris */}
        <radialGradient id="wa-iris" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#81c784" />
          <stop offset="50%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#2e7d32" />
        </radialGradient>

        {/* Shirt — teal/green crew-neck */}
        <linearGradient id="wa-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#26a69a" />
          <stop offset="100%" stopColor="#00796b" />
        </linearGradient>

        <linearGradient id="wa-collar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#80cbc4" />
          <stop offset="100%" stopColor="#004d40" />
        </linearGradient>

        <radialGradient id="wa-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 130, 110, 0.4)" />
          <stop offset="100%" stopColor="rgba(255, 130, 110, 0)" />
        </radialGradient>

        <linearGradient id="wa-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#efbe96" />
          <stop offset="100%" stopColor="#ce8d5f" />
        </linearGradient>

        <radialGradient id="wa-gloss" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes wa-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
        .wa-body { animation: ${state === 'idle' ? 'wa-breathe 3s ease-in-out infinite' : 'none'}; transform-origin: 130px 150px; }
      `}</style>

      <g className="wa-body">
        {/* Shirt */}
        <ellipse cx="130" cy="294" rx="88" ry="42" fill="url(#wa-shirt)" />
        <path d="M 60 268 Q 130 256 200 268 L 218 300 L 42 300 Z" fill="url(#wa-shirt)" />
        
        {/* Collar */}
        <path d="M 85 258 Q 130 270 175 258 Q 148 276 130 280 Q 112 276 85 258 Z" fill="url(#wa-collar)" opacity="0.5" />

        {/* Neck */}
        <ellipse cx="130" cy="252" rx="30" ry="22" fill="url(#wa-neck)" />

        {/* Left ear */}
        <ellipse cx="38" cy="158" rx="19" ry="24" fill="url(#wa-ear)" />
        <ellipse cx="42" cy="158" rx="12" ry="16" fill="#ebac80" opacity="0.7" />
        <ellipse cx="42" cy="158" rx="6" ry="9" fill="#cf8656" opacity="0.5" />

        {/* Right ear */}
        <ellipse cx="222" cy="158" rx="19" ry="24" fill="url(#wa-ear)" />
        <ellipse cx="218" cy="158" rx="12" ry="16" fill="#ebac80" opacity="0.7" />
        <ellipse cx="218" cy="158" rx="6" ry="9" fill="#cf8656" opacity="0.5" />

        {/* Hair back */}
        <ellipse cx="130" cy="98" rx="90" ry="72" fill="#4a2610" />

        {/* Face oval */}
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#wa-skin)" />
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#wa-vignette)" />

        {/* Hair front */}
        <path d="M 42 120 Q 44 52 130 40 Q 216 52 218 120 Q 195 72 155 60 Q 130 52 108 58 Q 72 64 42 120 Z" fill="url(#wa-hair-base)" />
        <path d="M 42 120 Q 48 80 80 65 Q 60 90 55 118 Z" fill="#4a2610" />
        <path d="M 218 120 Q 210 78 172 60 Q 196 80 202 118 Z" fill="#4a2610" />
        <path d="M 60 100 Q 90 48 130 40 Q 170 48 200 100 Q 175 62 130 55 Q 85 62 60 100 Z" fill="url(#wa-hair-sheen)" />
        
        {/* Hair highlight */}
        <ellipse cx="108" cy="62" rx="22" ry="8" fill="rgba(255,200,150,0.3)" transform="rotate(-18 108 62)" />

        {/* Forehead gloss */}
        <ellipse cx="112" cy="100" rx="34" ry="20" fill="url(#wa-gloss)" transform="rotate(-12 112 100)" />

        {/* Eyebrows */}
        <g transform={isBlink ? "translate(0, -4)" : ""}>
          <path d="M 80 118 Q 100 110 118 115" stroke="#3d1f00" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 142 115 Q 160 110 180 118" stroke="#3d1f00" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>

        {/* Left eye */}
        <circle cx="103" cy="140" r="26" fill="white" />
        <circle cx="103" cy="142" r="18" fill="url(#wa-iris)" />
        <circle cx="103" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="110" cy="134" r="8" fill="rgba(255,255,255,0.92)" />
        <circle cx="97" cy="149" r="3" fill="rgba(255,255,255,0.50)" />
        <path d="M 78 138 Q 103 122 128 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="103" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#f7cdad" />

        {/* Right eye */}
        <circle cx="157" cy="140" r="26" fill="white" />
        <circle cx="157" cy="142" r="18" fill="url(#wa-iris)" />
        <circle cx="157" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="164" cy="134" r="8" fill="rgba(255,255,255,0.92)" />
        <circle cx="151" cy="149" r="3" fill="rgba(255,255,255,0.50)" />
        <path d="M 132 138 Q 157 122 182 138" stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="157" cy="128" rx="28" ry={isBlink ? 26 : 0} fill="#f7cdad" />

        {/* Under-eye shadow */}
        <ellipse cx="103" cy="164" rx="22" ry="7" fill="rgba(180,90,30,0.13)" />
        <ellipse cx="157" cy="164" rx="22" ry="7" fill="rgba(180,90,30,0.13)" />

        {/* Cheek blush */}
        <ellipse cx="66" cy="178" rx="30" ry="18" fill="url(#wa-blush)" />
        <ellipse cx="194" cy="178" rx="30" ry="18" fill="url(#wa-blush)" />

        {/* Nose */}
        <path d="M 130 170 Q 122 184 116 190 Q 130 196 144 190 Q 138 184 130 170 Z" fill="rgba(175,90,30,0.18)" />
        <ellipse cx="118" cy="188" rx="7" ry="5" fill="rgba(140,65,20,0.32)" transform="rotate(-8 118 188)" />
        <ellipse cx="142" cy="188" rx="7" ry="5" fill="rgba(140,65,20,0.32)" transform="rotate(8 142 188)" />
        <ellipse cx="130" cy="178" rx="5" ry="8" fill="rgba(255,230,200,0.38)" />

        {/* Mouth Group */}
        <g transform={isMouth ? "translate(0, 7) scale(1, 1.6)" : "translate(0,0) scale(1,1)"} transform-origin="130 196">
          {/* Upper lip */}
          <path d="M 106 200 Q 118 194 130 197 Q 142 194 154 200 Q 142 207 130 205 Q 118 207 106 200 Z" fill="#c2556e" />
          <path d="M 114 196 Q 130 191 146 196" stroke="rgba(255,190,200,0.55)" strokeWidth="1.5" fill="none" />

          {/* Neutral closed */}
          {!isMouth && (
            <path d="M 106 200 Q 130 216 154 200 Q 150 210 130 212 Q 110 210 106 200 Z" fill="#d4667e" opacity="0.9" />
          )}

          {/* Mouth open */}
          {isMouth && (
            <g>
              <ellipse cx="130" cy="208" rx="22" ry="16" fill="#3d0018" />
              <ellipse cx="130" cy="216" rx="14" ry="8" fill="#e57399" opacity="0.85" />
              <ellipse cx="130" cy="203" rx="18" ry="6" fill="white" opacity="0.92" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
};

export default function WarmApproachable() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6ec] to-[#fef3c7] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Let's verify it's you</h1>
          <p className="text-amber-700/80">Follow the friendly guide below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: 'idle', label: 'Idle', state: 'idle' as ChallengeState },
            { id: 'blink', label: 'Blink', state: 'blink' as ChallengeState },
            { id: 'mouth', label: 'Mouth Open', state: 'mouth' as ChallengeState },
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              <div className="bg-white border-2 border-amber-100 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(251,191,36,0.12)] flex flex-col items-center justify-center w-full aspect-[4/5] relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
                <AvatarSVG state={item.state} />
              </div>
              <div className="mt-6 bg-amber-50 border border-amber-200 px-6 py-2.5 rounded-full shadow-sm">
                <span className="text-amber-800 font-bold text-sm">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
