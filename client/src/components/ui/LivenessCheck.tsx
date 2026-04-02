import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Camera, Loader2 } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

type Challenge = 'blink' | 'mouth';
type Phase = 'idle' | 'loading' | 'detecting' | 'done' | 'error';

interface LivenessCheckProps {
  onVerified: (selfieDataUrl: string) => void;
  onCancel: () => void;
  existingSelfie?: string | null;
  onRetake?: () => void;
}

const BLINK_THRESHOLD = 0.38;
const MOUTH_THRESHOLD = 0.30;
const CONFIRM_FRAMES = 3;

function getBlendshape(result: any, name: string): number {
  return result.faceBlendshapes?.[0]?.categories?.find(
    (c: any) => c.categoryName === name
  )?.score ?? 0;
}

function AvatarFace({ challenge, allDone }: { challenge: Challenge | null; allDone: boolean }) {
  const isBlinking = challenge === 'blink';
  const isMouth = challenge === 'mouth';

  return (
    <svg viewBox="0 0 200 220" width="160" height="176" aria-hidden style={{ filter: 'drop-shadow(0 8px 24px rgba(124,58,237,0.35))' }}>
      <defs>
        {/* Outer glow ring gradient */}
        <linearGradient id="lv-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={allDone ? '#10b981' : '#7c3aed'} />
          <stop offset="50%" stopColor={allDone ? '#34d399' : '#a855f7'} />
          <stop offset="100%" stopColor={allDone ? '#6ee7b7' : '#f59e0b'} />
        </linearGradient>
        {/* Background disc */}
        <radialGradient id="lv-bg" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f0a1e" />
        </radialGradient>
        {/* Skin gradient — warm, 3D depth */}
        <radialGradient id="lv-skin" cx="42%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#fde8c8" />
          <stop offset="40%"  stopColor="#f5c99a" />
          <stop offset="80%"  stopColor="#e8a96e" />
          <stop offset="100%" stopColor="#c47d3b" />
        </radialGradient>
        {/* Face edge shadow */}
        <radialGradient id="lv-shade" cx="50%" cy="50%" r="50%">
          <stop offset="60%"  stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(80,30,0,0.35)" />
        </radialGradient>
        {/* Hair gradient */}
        <linearGradient id="lv-hair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#2d1b00" />
          <stop offset="100%" stopColor="#1a0f00" />
        </linearGradient>
        {/* Iris gradient — gold / amber brand color */}
        <radialGradient id="lv-iris-l" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={allDone ? '#34d399' : '#f59e0b'} />
          <stop offset="50%"  stopColor={allDone ? '#059669' : '#b45309'} />
          <stop offset="100%" stopColor={allDone ? '#064e3b' : '#451a03'} />
        </radialGradient>
        <radialGradient id="lv-iris-r" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={allDone ? '#34d399' : '#f59e0b'} />
          <stop offset="50%"  stopColor={allDone ? '#059669' : '#b45309'} />
          <stop offset="100%" stopColor={allDone ? '#064e3b' : '#451a03'} />
        </radialGradient>
        {/* Lip gradient */}
        <linearGradient id="lv-lip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#c2185b" />
          <stop offset="100%" stopColor="#880e4f" />
        </linearGradient>
        {/* Cheek blush */}
        <radialGradient id="lv-blush-l" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,120,120,0.35)" />
          <stop offset="100%" stopColor="rgba(255,120,120,0)" />
        </radialGradient>
        <radialGradient id="lv-blush-r" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,120,120,0.35)" />
          <stop offset="100%" stopColor="rgba(255,120,120,0)" />
        </radialGradient>
        {/* Forehead specular highlight */}
        <radialGradient id="lv-spec" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Neck gradient */}
        <linearGradient id="lv-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8a96e" />
          <stop offset="100%" stopColor="#c47d3b" />
        </linearGradient>
        {/* Done glow */}
        <filter id="lv-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes lv-blink {
          0%, 25%, 100% { ry: 0px; }
          8%             { ry: 14px; }
          16%            { ry: 14px; }
        }
        @keyframes lv-brow-up {
          0%, 100% { transform: translateY(0); }
          30%, 70% { transform: translateY(-3px); }
        }
        @keyframes lv-jaw-open {
          0%, 100% { transform: translateY(0) scaleY(1); }
          35%, 65%  { transform: translateY(5px) scaleY(1.5); }
        }
        @keyframes lv-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.008); }
        }
        @keyframes lv-done-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lv-ring-spin {
          from { stroke-dashoffset: 502; }
          to   { stroke-dashoffset: 0; }
        }
        .lv-face-group { animation: lv-breathe 3s ease-in-out infinite; transform-origin: 100px 110px; }
        .lv-lid-l { animation: ${isBlinking ? 'lv-blink 2s ease-in-out infinite' : 'none'}; transform-origin: 72px 96px; }
        .lv-lid-r { animation: ${isBlinking ? 'lv-blink 2s ease-in-out infinite' : 'none'}; transform-origin: 128px 96px; }
        .lv-brow  { animation: ${isBlinking ? 'lv-brow-up 2s ease-in-out infinite' : 'none'}; }
        .lv-jaw-g { animation: ${isMouth ? 'lv-jaw-open 2s ease-in-out infinite' : 'none'}; transform-origin: 100px 148px; }
        .lv-done-g { animation: lv-done-pop 0.5s cubic-bezier(.17,.67,.37,1.25) both; }
      `}</style>

      {/* ── Background disc ────────────────────────────────── */}
      <circle cx="100" cy="110" r="96" fill="url(#lv-bg)" />

      {/* ── Outer glow ring ────────────────────────────────── */}
      <circle cx="100" cy="110" r="94" fill="none"
        stroke="url(#lv-ring)" strokeWidth={allDone ? '4' : '3'}
        strokeDasharray="502" strokeLinecap="round"
        opacity={allDone ? '1' : '0.85'} />

      {/* ── Main face group (subtle breathing) ─────────────── */}
      <g className="lv-face-group">

        {/* Neck */}
        <rect x="84" y="178" width="32" height="28" rx="12" fill="url(#lv-neck)" />

        {/* Face oval */}
        <ellipse cx="100" cy="118" rx="62" ry="74" fill="url(#lv-skin)" />
        {/* Edge shading for 3D roundness */}
        <ellipse cx="100" cy="118" rx="62" ry="74" fill="url(#lv-shade)" />

        {/* Hair — covers top dome */}
        <ellipse cx="100" cy="68" rx="62" ry="42" fill="url(#lv-hair)" />
        {/* Hair parting / styling shape */}
        <path d="M 100 46 Q 115 52 138 62 Q 162 48 155 35 Q 130 20 100 22 Q 70 20 45 35 Q 38 48 62 62 Q 85 52 100 46 Z"
          fill="#3d2600" opacity="0.7" />
        {/* Hair highlight */}
        <ellipse cx="88" cy="52" rx="18" ry="8" fill="rgba(255,200,100,0.12)" transform="rotate(-15 88 52)" />

        {/* Forehead specular */}
        <ellipse cx="88" cy="78" rx="22" ry="14" fill="url(#lv-spec)" />

        {/* ── Eyebrows ─────────────────────────────────────── */}
        <g className="lv-brow">
          <path d="M 52 88 Q 66 82 80 86" stroke="#3d2600" strokeWidth="4.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 120 86 Q 134 82 148 88" stroke="#3d2600" strokeWidth="4.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* ── Eyes ─────────────────────────────────────────── */}
        {/* Left eye */}
        <g>
          <ellipse cx="72" cy="104" rx="17" ry="13" fill="white" />
          <ellipse cx="72" cy="105" rx="11" ry="11" fill="url(#lv-iris-l)" />
          <ellipse cx="72" cy="105" rx="6" ry="6" fill="#0f0500" />
          <circle cx="76" cy="101" r="3.5" fill="rgba(255,255,255,0.8)" />
          <circle cx="69" cy="107" r="1.5" fill="rgba(255,255,255,0.4)" />
          {/* Upper eyelid line */}
          <path d="M 55 104 Q 72 94 89 104" fill="#3d2600" opacity="0.25" />
          {/* Lash line */}
          <path d="M 56 104 Q 72 96 88 104" stroke="#1a0f00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Animated eyelid */}
          <ellipse className="lv-lid-l" cx="72" cy="98" rx="18" ry="0" fill="#f5c99a" />
        </g>

        {/* Right eye */}
        <g>
          <ellipse cx="128" cy="104" rx="17" ry="13" fill="white" />
          <ellipse cx="128" cy="105" rx="11" ry="11" fill="url(#lv-iris-r)" />
          <ellipse cx="128" cy="105" rx="6" ry="6" fill="#0f0500" />
          <circle cx="132" cy="101" r="3.5" fill="rgba(255,255,255,0.8)" />
          <circle cx="125" cy="107" r="1.5" fill="rgba(255,255,255,0.4)" />
          <path d="M 111 104 Q 128 94 145 104" fill="#3d2600" opacity="0.25" />
          <path d="M 112 104 Q 128 96 144 104" stroke="#1a0f00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse className="lv-lid-r" cx="128" cy="98" rx="18" ry="0" fill="#f5c99a" />
        </g>

        {/* Under-eye soft shadow */}
        <ellipse cx="72" cy="116" rx="16" ry="5" fill="rgba(150,80,20,0.12)" />
        <ellipse cx="128" cy="116" rx="16" ry="5" fill="rgba(150,80,20,0.12)" />

        {/* Cheek blush */}
        <ellipse cx="54" cy="128" rx="20" ry="12" fill="url(#lv-blush-l)" />
        <ellipse cx="146" cy="128" rx="20" ry="12" fill="url(#lv-blush-r)" />

        {/* ── Nose ─────────────────────────────────────────── */}
        <path d="M 100 118 Q 96 132 90 136 Q 100 140 110 136 Q 104 132 100 118 Z"
          fill="rgba(160,90,30,0.25)" />
        {/* Nose highlight */}
        <ellipse cx="100" cy="124" rx="4" ry="6" fill="rgba(255,220,170,0.4)" />
        {/* Nostrils */}
        <ellipse cx="91" cy="137" rx="5" ry="3.5" fill="rgba(120,60,10,0.35)" transform="rotate(-10 91 137)" />
        <ellipse cx="109" cy="137" rx="5" ry="3.5" fill="rgba(120,60,10,0.35)" transform="rotate(10 109 137)" />

        {/* ── Mouth ────────────────────────────────────────── */}
        <g className="lv-jaw-g">
          {/* Upper lip */}
          <path d="M 80 150 Q 90 145 100 148 Q 110 145 120 150 Q 110 156 100 154 Q 90 156 80 150 Z"
            fill="url(#lv-lip)" />
          {/* Cupid's bow highlight */}
          <path d="M 88 147 Q 100 143 112 147" stroke="rgba(255,180,200,0.5)" strokeWidth="1.5" fill="none" />

          {/* Neutral lower lip / closed smile (shown when not in mouth challenge and not done) */}
          {!isMouth && !allDone && (
            <path d="M 80 150 Q 100 162 120 150 Q 110 158 100 158 Q 90 158 80 150 Z"
              fill="#d4766e" opacity="0.85" />
          )}

          {/* Mouth open challenge */}
          {isMouth && (
            <g>
              <ellipse cx="100" cy="158" rx="18" ry="3" fill="#3d0015">
                <animate attributeName="ry" values="3;14;3" dur="2s" ease="ease-in-out" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="100" cy="158" rx="14" ry="2" fill="#7b1fa2" opacity="0.7">
                <animate attributeName="ry" values="2;9;2" dur="2s" ease="ease-in-out" repeatCount="indefinite" begin="0.05s" />
              </ellipse>
              {/* Teeth */}
              <ellipse cx="100" cy="154" rx="13" ry="2" fill="white" opacity="0.9">
                <animate attributeName="ry" values="1;5;1" dur="2s" ease="ease-in-out" repeatCount="indefinite" begin="0.1s" />
              </ellipse>
            </g>
          )}

          {/* Done: wide happy smile */}
          {allDone && (
            <g className="lv-done-g" filter="url(#lv-glow)">
              <path d="M 74 152 Q 100 176 126 152 Q 114 162 100 164 Q 86 162 74 152 Z"
                fill="#10b981" opacity="0.9" />
              <path d="M 80 152 Q 100 170 120 152" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.6" />
              {/* Dimples */}
              <circle cx="76" cy="154" r="3" fill="rgba(255,100,120,0.3)" />
              <circle cx="124" cy="154" r="3" fill="rgba(255,100,120,0.3)" />
            </g>
          )}
        </g>

        {/* Done overlay: green sparkle ring */}
        {allDone && (
          <g className="lv-done-g">
            <circle cx="100" cy="110" r="90" fill="none" stroke="#10b981" strokeWidth="6"
              strokeDasharray="15 8" opacity="0.5" />
          </g>
        )}
      </g>
    </svg>
  );
}

function ChallengeStep({
  label,
  icon,
  done,
  active,
}: { label: string; icon: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
      done
        ? 'bg-green-100 text-green-700'
        : active
        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 ring-offset-1'
        : 'bg-muted text-muted-foreground'
    }`}>
      {done ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
      ) : (
        <span className="text-base leading-none">{icon}</span>
      )}
      <span>{label}</span>
    </div>
  );
}

export function LivenessCheck({ onVerified, onCancel, existingSelfie, onRetake }: LivenessCheckProps) {
  const [phase, setPhase] = useState<Phase>(existingSelfie ? 'done' : 'idle');
  const [loadingMsg, setLoadingMsg] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [challenges] = useState<Challenge[]>(() =>
    Math.random() > 0.5 ? ['blink', 'mouth'] : ['mouth', 'blink']
  );
  const [completedSet, setCompletedSet] = useState<Set<Challenge>>(new Set());
  const [selfie, setSelfie] = useState<string | null>(existingSelfie ?? null);
  const [noFaceWarning, setNoFaceWarning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const completedRef = useRef<Set<Challenge>>(new Set());
  const challengesRef = useRef(challenges);
  const blinkCountRef = useRef(0);
  const mouthCountRef = useRef(0);
  const blinkWasOpenRef = useRef(true);
  const capturingRef = useRef(false);
  const noFaceFramesRef = useRef(0);

  useEffect(() => { completedRef.current = completedSet; }, [completedSet]);

  const currentChallenge = challenges.find(c => !completedSet.has(c)) ?? null;
  const allDone = completedSet.size === challenges.length;

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const takeSelfie = useCallback(() => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      setSelfie(dataUrl);
      stopCamera();
      setPhase('done');
      toast.success('Liveness verified!');
      onVerified(dataUrl);
    }
  }, [stopCamera, onVerified]);

  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const fl = faceLandmarkerRef.current;
    if (!video || !fl || video.paused || video.ended) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    let result: any;
    try {
      result = fl.detectForVideo(video, performance.now());
    } catch {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const hasFace = result.faceLandmarks?.length > 0;

    if (!hasFace) {
      noFaceFramesRef.current++;
      if (noFaceFramesRef.current > 30) setNoFaceWarning(true);
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    noFaceFramesRef.current = 0;
    setNoFaceWarning(false);

    const completed = completedRef.current;
    const allChallenges = challengesRef.current;
    const current = allChallenges.find(c => !completed.has(c)) ?? null;

    if (!current) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const blinkL = getBlendshape(result, 'eyeBlinkLeft');
    const blinkR = getBlendshape(result, 'eyeBlinkRight');
    const jawOpen = getBlendshape(result, 'jawOpen');

    if (current === 'blink') {
      const eyesClosed = blinkL > BLINK_THRESHOLD || blinkR > BLINK_THRESHOLD;
      if (eyesClosed && blinkWasOpenRef.current) {
        blinkCountRef.current++;
        if (blinkCountRef.current >= CONFIRM_FRAMES) {
          blinkWasOpenRef.current = false;
          blinkCountRef.current = 0;
          const next = new Set([...completed, 'blink' as Challenge]);
          completedRef.current = next;
          setCompletedSet(next);
          if (next.size === allChallenges.length) {
            setTimeout(takeSelfie, 700);
            return;
          }
        }
      } else if (!eyesClosed) {
        blinkWasOpenRef.current = true;
        blinkCountRef.current = 0;
      }
    }

    if (current === 'mouth') {
      if (jawOpen > MOUTH_THRESHOLD) {
        mouthCountRef.current++;
        if (mouthCountRef.current >= CONFIRM_FRAMES) {
          mouthCountRef.current = 0;
          const next = new Set([...completed, 'mouth' as Challenge]);
          completedRef.current = next;
          setCompletedSet(next);
          if (next.size === allChallenges.length) {
            setTimeout(takeSelfie, 700);
            return;
          }
        }
      } else {
        mouthCountRef.current = 0;
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [takeSelfie]);

  const startCheck = useCallback(async () => {
    setPhase('loading');
    setError(null);
    blinkCountRef.current = 0;
    mouthCountRef.current = 0;
    blinkWasOpenRef.current = true;
    capturingRef.current = false;
    noFaceFramesRef.current = 0;
    completedRef.current = new Set();
    setCompletedSet(new Set());
    setNoFaceWarning(false);

    try {
      setLoadingMsg('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((res, rej) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play().then(res).catch(rej);
          };
        });
      }

      setLoadingMsg('Loading face detection model (~6 MB)...');
      if (!faceLandmarkerRef.current) {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      }

      setPhase('detecting');
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch (err: any) {
      stopCamera();
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Please connect a camera and try again.'
          : `Could not start liveness check: ${err.message}`;
      setError(msg);
      setPhase('error');
    }
  }, [detectLoop, stopCamera]);

  const handleRetake = useCallback(() => {
    setSelfie(null);
    setPhase('idle');
    if (onRetake) onRetake();
  }, [onRetake]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const challengeLabel: Record<Challenge, string> = { blink: 'Blink', mouth: 'Open mouth' };
  const challengeIcon: Record<Challenge, string> = { blink: '👁', mouth: '👄' };

  return (
    <div className="flex flex-col items-center gap-4 w-full py-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── IDLE ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-28 h-28 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Follow simple on-screen prompts to confirm you're a real person.</p>
            <p className="text-xs text-muted-foreground mt-1">No data leaves your device — all processing is on-device.</p>
          </div>
          <Button
            type="button"
            onClick={startCheck}
            className="gap-2 bg-primary text-white"
            data-testid="button-start-liveness"
          >
            <Camera className="w-4 h-4" />
            Start Liveness Check
          </Button>
        </div>
      )}

      {/* ── LOADING ───────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{loadingMsg}</p>
        </div>
      )}

      {/* ── DETECTING ─────────────────────────────────────── */}
      {phase === 'detecting' && (
        <div className="flex flex-col items-center gap-4 w-full">

          {/* Instruction banner */}
          <div className="w-full rounded-xl px-4 py-2.5 text-center"
            style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #a16207 100%)' }}>
            <p className="text-sm font-bold text-white tracking-wide">
              {currentChallenge === 'blink' && '👁  Blink your eyes now'}
              {currentChallenge === 'mouth' && '👄  Open your mouth wide'}
              {allDone && '✅  Liveness confirmed!'}
            </p>
          </div>

          {/* Avatar + Camera side by side */}
          <div className="flex items-center justify-center gap-6 w-full">

            {/* 3D Avatar */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Guide</p>
              <AvatarFace challenge={currentChallenge} allDone={allDone} />
            </div>

            {/* Camera circle */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">You</p>
              <div
                className="relative rounded-full overflow-hidden shadow-2xl"
                style={{
                  width: 156,
                  height: 156,
                  border: '4px solid transparent',
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #7c3aed, #f59e0b) border-box',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2">
            {challenges.map((c) => (
              <ChallengeStep
                key={c}
                label={challengeLabel[c]}
                icon={challengeIcon[c]}
                done={completedSet.has(c)}
                active={currentChallenge === c}
              />
            ))}
          </div>

          {/* No face warning */}
          {noFaceWarning && (
            <p className="text-xs text-amber-600 text-center">
              ⚠ No face detected — move closer and ensure good lighting
            </p>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { stopCamera(); onCancel(); }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* ── DONE ──────────────────────────────────────────── */}
      {phase === 'done' && selfie && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-green-500 shadow-lg">
              <img src={selfie} alt="Verified selfie" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-700">Liveness Verified</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your identity has been confirmed</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="gap-1.5"
            data-testid="button-retake-liveness"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retake
          </Button>
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-sm text-red-600 max-w-xs">{error}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setPhase('idle'); }}>
              Try Again
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
