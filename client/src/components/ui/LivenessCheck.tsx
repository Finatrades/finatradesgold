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
    <svg viewBox="0 0 120 120" width="110" height="110" aria-hidden>
      <style>{`
        @keyframes lv-blink {
          0%, 30%, 100% { ry: 0px; }
          10%, 20%      { ry: 13px; }
        }
        @keyframes lv-jaw {
          0%, 100% { ry: 2px; }
          40%, 60% { ry: 11px; }
        }
        @keyframes lv-smile-pop {
          0%   { transform: scale(0.8); }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .lv-eyelid-l { animation: ${isBlinking ? 'lv-blink 1.6s ease-in-out infinite' : 'none'}; transform-origin: 42px 48px; }
        .lv-eyelid-r { animation: ${isBlinking ? 'lv-blink 1.6s ease-in-out infinite' : 'none'}; transform-origin: 78px 48px; }
        .lv-jaw      { animation: ${isMouth    ? 'lv-jaw   1.8s ease-in-out infinite' : 'none'}; transform-origin: 60px 84px; }
        .lv-done     { animation: lv-smile-pop 0.4s ease-out both; }
      `}</style>

      {/* Face */}
      <circle cx="60" cy="60" r="56"
        fill={allDone ? '#d1fae5' : '#fef3c7'}
        stroke={allDone ? '#059669' : '#d97706'}
        strokeWidth="2.5" />

      {/* Eyebrows */}
      <path d="M 33 35 Q 42 30 51 35" stroke={allDone ? '#059669' : '#92400e'} strokeWidth="2.5" fill="none" strokeLinecap="round"
        style={{ transform: isBlinking ? 'translateY(-3px)' : 'none', transition: 'transform 0.3s' }} />
      <path d="M 69 35 Q 78 30 87 35" stroke={allDone ? '#059669' : '#92400e'} strokeWidth="2.5" fill="none" strokeLinecap="round"
        style={{ transform: isBlinking ? 'translateY(-3px)' : 'none', transition: 'transform 0.3s' }} />

      {/* Left eye white */}
      <ellipse cx="42" cy="50" rx="10" ry="12" fill="white" />
      {/* Left pupil */}
      <ellipse cx="42" cy="51" rx={allDone ? 6 : 5} ry={allDone ? 8 : 7} fill="#1a1a1a" />
      {allDone && <circle cx="44" cy="49" r="2" fill="white" />}
      {/* Left eyelid (animated closed on blink) */}
      <ellipse className="lv-eyelid-l" cx="42" cy="47" rx="11" ry="0" fill={allDone ? '#d1fae5' : '#fef3c7'} />

      {/* Right eye white */}
      <ellipse cx="78" cy="50" rx="10" ry="12" fill="white" />
      {/* Right pupil */}
      <ellipse cx="78" cy="51" rx={allDone ? 6 : 5} ry={allDone ? 8 : 7} fill="#1a1a1a" />
      {allDone && <circle cx="80" cy="49" r="2" fill="white" />}
      {/* Right eyelid (animated closed on blink) */}
      <ellipse className="lv-eyelid-r" cx="78" cy="47" rx="11" ry="0" fill={allDone ? '#d1fae5' : '#fef3c7'} />

      {/* Nose */}
      <circle cx="60" cy="66" r="2" fill="#d97706" opacity="0.6" />

      {/* Mouth – neutral curve (hidden when mouth challenge or done) */}
      {!isMouth && !allDone && (
        <path d="M 44 80 Q 60 90 76 80" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}

      {/* Mouth open challenge: animated oval */}
      {isMouth && (
        <>
          <ellipse cx="60" cy="84" rx="14" ry="2" fill="#9b1c1c">
            <animate attributeName="ry" values="2;11;2" dur="1.8s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="60" cy="84" rx="10" ry="2" fill="#fca5a5">
            <animate attributeName="ry" values="1;7;1" dur="1.8s" repeatCount="indefinite" begin="0.05s" />
          </ellipse>
        </>
      )}

      {/* Done: big smile */}
      {allDone && (
        <g className="lv-done">
          <path d="M 36 76 Q 60 100 84 76" stroke="#059669" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 36 76 Q 60 100 84 76 Q 84 85 60 85 Q 36 85 36 76 Z" stroke="none" fill="#bbf7d0" fillOpacity="0.6" />
        </g>
      )}
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
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">

          {/* Avatar + instruction */}
          <div className="flex flex-col items-center gap-1">
            <AvatarFace challenge={currentChallenge} allDone={allDone} />
            <p className="text-sm font-semibold text-primary animate-pulse">
              {currentChallenge === 'blink' && '👁  Blink your eyes'}
              {currentChallenge === 'mouth' && '👄  Open your mouth wide'}
            </p>
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

          {/* Camera circle */}
          <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-primary shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
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
