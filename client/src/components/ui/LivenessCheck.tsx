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

// ─── Pixar / claymorphism 3D cartoon avatar ────────────────────────────────

function AvatarFace({ challenge, allDone }: { challenge: Challenge | null; allDone: boolean }) {
  const isBlinking = challenge === 'blink';
  const isMouth = challenge === 'mouth';

  return (
    <svg
      viewBox="0 0 260 300"
      width="170" height="197"
      aria-hidden
      style={{ filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.30))' }}
    >
      <defs>
        {/* Skin — warm peach, bright top-left highlight */}
        <radialGradient id="cv-skin" cx="38%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#fdebd4" />
          <stop offset="35%"  stopColor="#f7c8a0" />
          <stop offset="75%"  stopColor="#e8a070" />
          <stop offset="100%" stopColor="#c97840" />
        </radialGradient>
        {/* Face edge vignette for 3D roundness */}
        <radialGradient id="cv-vignette" cx="50%" cy="52%" r="50%">
          <stop offset="58%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(100,45,0,0.28)" />
        </radialGradient>
        {/* Ear skin */}
        <radialGradient id="cv-ear" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#f7c8a0" />
          <stop offset="100%" stopColor="#d98e55" />
        </radialGradient>
        {/* Hair — brown with blue-grey crown sheen */}
        <linearGradient id="cv-hair-base" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#7a5230" />
          <stop offset="45%"  stopColor="#5a3a1a" />
          <stop offset="100%" stopColor="#2e1a06" />
        </linearGradient>
        <linearGradient id="cv-hair-sheen" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="rgba(90,70,110,0.55)" />
          <stop offset="100%" stopColor="rgba(90,70,110,0)" />
        </linearGradient>
        {/* Eyes — cartoon green iris */}
        <radialGradient id="cv-iris" cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={allDone ? '#6ee7b7' : '#66bb6a'} />
          <stop offset="50%"  stopColor={allDone ? '#10b981' : '#388e3c'} />
          <stop offset="100%" stopColor={allDone ? '#065f46' : '#1b5e20'} />
        </radialGradient>
        {/* Teal shirt */}
        <linearGradient id="cv-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#26a69a" />
          <stop offset="100%" stopColor="#00796b" />
        </linearGradient>
        {/* Blue collar */}
        <linearGradient id="cv-collar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1976d2" />
          <stop offset="100%" stopColor="#0d47a1" />
        </linearGradient>
        {/* Cheek blush */}
        <radialGradient id="cv-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,140,110,0.38)" />
          <stop offset="100%" stopColor="rgba(255,140,110,0)" />
        </radialGradient>
        {/* Neck */}
        <linearGradient id="cv-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f0b07a" />
          <stop offset="100%" stopColor="#d08040" />
        </linearGradient>
        {/* Forehead gloss */}
        <radialGradient id="cv-gloss" cx="45%" cy="45%" r="55%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes cv-blink {
          0%, 22%, 100% { ry: 0; }
          7%, 15%        { ry: 26px; }
        }
        @keyframes cv-brow-raise {
          0%, 100% { transform: translateY(0); }
          25%, 75%  { transform: translateY(-4px); }
        }
        @keyframes cv-jaw {
          0%, 100% { transform: translateY(0) scaleY(1); }
          30%, 70%  { transform: translateY(7px) scaleY(1.6); }
        }
        @keyframes cv-breathe {
          0%, 100% { transform: scale(1);     }
          50%      { transform: scale(1.012); }
        }
        @keyframes cv-done-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          65%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .cv-body  { animation: cv-breathe 3.2s ease-in-out infinite; transform-origin: 130px 150px; }
        .cv-lid-l { animation: ${isBlinking ? 'cv-blink 2s ease-in-out infinite' : 'none'}; transform-origin: 103px 138px; }
        .cv-lid-r { animation: ${isBlinking ? 'cv-blink 2s ease-in-out infinite' : 'none'}; transform-origin: 157px 138px; }
        .cv-brows { animation: ${isBlinking ? 'cv-brow-raise 2s ease-in-out infinite' : 'none'}; }
        .cv-jaw   { animation: ${isMouth ? 'cv-jaw 2.2s ease-in-out infinite' : 'none'}; transform-origin: 130px 196px; }
        .cv-done  { animation: cv-done-pop 0.55s cubic-bezier(.17,.67,.37,1.35) both; }
      `}</style>

      {/* ── Breathing group ─────────────────────────────── */}
      <g className="cv-body">

        {/* Teal shirt */}
        <ellipse cx="130" cy="294" rx="88" ry="42" fill="url(#cv-shirt)" />
        <path d="M 60 268 Q 130 256 200 268 L 218 300 L 42 300 Z" fill="url(#cv-shirt)" />
        {/* Blue V-collar */}
        <path d="M 92 260 Q 130 252 168 260 Q 148 270 130 276 Q 112 270 92 260 Z"
          fill="url(#cv-collar)" />

        {/* Neck */}
        <ellipse cx="130" cy="252" rx="30" ry="22" fill="url(#cv-neck)" />

        {/* Left ear */}
        <ellipse cx="38"  cy="158" rx="19" ry="24" fill="url(#cv-ear)" />
        <ellipse cx="42"  cy="158" rx="12" ry="16" fill="#e89060" opacity="0.7" />
        <ellipse cx="42"  cy="158" rx="6"  ry="9"  fill="#c87040" opacity="0.5" />

        {/* Right ear */}
        <ellipse cx="222" cy="158" rx="19" ry="24" fill="url(#cv-ear)" />
        <ellipse cx="218" cy="158" rx="12" ry="16" fill="#e89060" opacity="0.7" />
        <ellipse cx="218" cy="158" rx="6"  ry="9"  fill="#c87040" opacity="0.5" />

        {/* Hair — back layer (behind face) */}
        <ellipse cx="130" cy="98" rx="90" ry="72" fill="#3d2008" />

        {/* Face oval */}
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#cv-skin)" />
        {/* Edge vignette for roundness */}
        <ellipse cx="130" cy="158" rx="88" ry="96" fill="url(#cv-vignette)" />

        {/* Hair — front, sweeping over forehead */}
        <path d="M 42 120 Q 44 52 130 40 Q 216 52 218 120
                 Q 195 72 155 60 Q 130 52 108 58 Q 72 64 42 120 Z"
          fill="url(#cv-hair-base)" />
        {/* Left side depth */}
        <path d="M 42 120 Q 48 80 80 65 Q 60 90 55 118 Z" fill="#2e1a06" />
        {/* Right side depth */}
        <path d="M 218 120 Q 210 78 172 60 Q 196 80 202 118 Z" fill="#2e1a06" />
        {/* Blue-grey crown sheen */}
        <path d="M 60 100 Q 90 48 130 40 Q 170 48 200 100
                 Q 175 62 130 55 Q 85 62 60 100 Z"
          fill="url(#cv-hair-sheen)" />
        {/* Hair highlight streak */}
        <ellipse cx="108" cy="62" rx="22" ry="8"
          fill="rgba(200,175,145,0.28)" transform="rotate(-18 108 62)" />

        {/* Forehead gloss */}
        <ellipse cx="112" cy="100" rx="34" ry="20"
          fill="url(#cv-gloss)" transform="rotate(-12 112 100)" />

        {/* ── Eyebrows ───────────────────────────────────── */}
        <g className="cv-brows">
          <path d="M 80 118 Q 100 110 118 115"
            stroke="#3d1f00" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 142 115 Q 160 110 180 118"
            stroke="#3d1f00" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>

        {/* ── Left eye ───────────────────────────────────── */}
        <circle cx="103" cy="140" r="26" fill="white" />
        <circle cx="103" cy="142" r="18" fill="url(#cv-iris)" />
        <circle cx="103" cy="142" r="10" fill="#0a1a0a" />
        {/* Large cartoon catchlight */}
        <circle cx="110" cy="134" r="8"  fill="rgba(255,255,255,0.92)" />
        <circle cx="97"  cy="149" r="3"  fill="rgba(255,255,255,0.50)" />
        {/* Upper lash line */}
        <path d="M 78 138 Q 103 122 128 138"
          stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Animated eyelid (closes on blink) */}
        <ellipse className="cv-lid-l" cx="103" cy="128" rx="28" ry="0" fill="#f7c8a0" />

        {/* ── Right eye ──────────────────────────────────── */}
        <circle cx="157" cy="140" r="26" fill="white" />
        <circle cx="157" cy="142" r="18" fill="url(#cv-iris)" />
        <circle cx="157" cy="142" r="10" fill="#0a1a0a" />
        <circle cx="164" cy="134" r="8"  fill="rgba(255,255,255,0.92)" />
        <circle cx="151" cy="149" r="3"  fill="rgba(255,255,255,0.50)" />
        <path d="M 132 138 Q 157 122 182 138"
          stroke="#1a0a00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse className="cv-lid-r" cx="157" cy="128" rx="28" ry="0" fill="#f7c8a0" />

        {/* Under-eye shadow */}
        <ellipse cx="103" cy="164" rx="22" ry="7" fill="rgba(180,90,30,0.13)" />
        <ellipse cx="157" cy="164" rx="22" ry="7" fill="rgba(180,90,30,0.13)" />

        {/* ── Cheek blush ────────────────────────────────── */}
        <ellipse cx="66"  cy="178" rx="30" ry="18" fill="url(#cv-blush)" />
        <ellipse cx="194" cy="178" rx="30" ry="18" fill="url(#cv-blush)" />

        {/* ── Nose ───────────────────────────────────────── */}
        <path d="M 130 170 Q 122 184 116 190 Q 130 196 144 190 Q 138 184 130 170 Z"
          fill="rgba(175,90,30,0.18)" />
        <ellipse cx="118" cy="188" rx="7" ry="5"
          fill="rgba(140,65,20,0.32)" transform="rotate(-8 118 188)" />
        <ellipse cx="142" cy="188" rx="7" ry="5"
          fill="rgba(140,65,20,0.32)" transform="rotate(8 142 188)" />
        <ellipse cx="130" cy="178" rx="5" ry="8" fill="rgba(255,230,200,0.38)" />

        {/* ── Mouth / jaw group (animated on mouth challenge) */}
        <g className="cv-jaw">
          {/* Upper lip */}
          <path d="M 106 200 Q 118 194 130 197 Q 142 194 154 200 Q 142 207 130 205 Q 118 207 106 200 Z"
            fill="#c2556e" />
          {/* Cupid's bow highlight */}
          <path d="M 114 196 Q 130 191 146 196"
            stroke="rgba(255,190,200,0.55)" strokeWidth="1.5" fill="none" />

          {/* Neutral — closed lower lip */}
          {!isMouth && !allDone && (
            <path d="M 106 200 Q 130 216 154 200 Q 150 210 130 212 Q 110 210 106 200 Z"
              fill="#d4667e" opacity="0.9" />
          )}

          {/* Mouth OPEN challenge */}
          {isMouth && (
            <g>
              <ellipse cx="130" cy="208" rx="22" ry="3" fill="#3d0018">
                <animate attributeName="ry" values="3;16;3" dur="2.2s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="130" cy="216" rx="14" ry="3" fill="#e57399" opacity="0.85">
                <animate attributeName="ry" values="2;8;2" dur="2.2s" repeatCount="indefinite" begin="0.06s" />
              </ellipse>
              <ellipse cx="130" cy="203" rx="18" ry="2" fill="white" opacity="0.92">
                <animate attributeName="ry" values="1;6;1" dur="2.2s" repeatCount="indefinite" begin="0.1s" />
              </ellipse>
            </g>
          )}

          {/* Done — big smile + teeth */}
          {allDone && (
            <g className="cv-done">
              <path d="M 98 200 Q 130 226 162 200 Q 158 214 130 216 Q 102 214 98 200 Z"
                fill="#10b981" opacity="0.92" />
              <ellipse cx="130" cy="204" rx="22" ry="5" fill="white" opacity="0.88" />
              <circle cx="98"  cy="204" r="5" fill="rgba(255,120,130,0.35)" />
              <circle cx="162" cy="204" r="5" fill="rgba(255,120,130,0.35)" />
            </g>
          )}
        </g>

        {/* Done sparkle ring */}
        {allDone && (
          <g className="cv-done">
            <circle cx="130" cy="150" r="118" fill="none"
              stroke="#10b981" strokeWidth="5"
              strokeDasharray="18 10" opacity="0.45" />
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

            {/* 3D cartoon avatar */}
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
