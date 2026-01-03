import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useChat } from '@/context/ChatContext';

interface CallOverlayProps {
  callerName?: string;
  isVisible: boolean;
}

export function CallOverlay({ callerName = 'User', isVisible }: CallOverlayProps) {
  const { 
    activeCall, 
    localStream, 
    remoteStream, 
    endCall, 
    toggleMute, 
    toggleVideo 
  } = useChat();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Attach remote stream to video element (for video calls)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  // Attach remote stream to audio element (only for audio-only calls)
  // For video calls, the video element handles audio playback
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && activeCall?.callType === 'audio') {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.callType]);
  
  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!isVisible || !activeCall) return null;
  
  const isVideoCall = activeCall.callType === 'video';
  const isConnected = activeCall.status === 'connected';
  const isConnecting = activeCall.status === 'connecting' || activeCall.status === 'ringing';
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        data-testid="call-overlay"
      >
        {/* Hidden audio element for remote audio playback (only for audio-only calls) */}
        {/* For video calls, the video element handles audio */}
        {!isVideoCall && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            className="hidden"
            data-testid="remote-audio"
          />
        )}
        
        <div className="relative w-full h-full flex flex-col">
          {/* Remote Video (Full Screen) */}
          {isVideoCall && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              data-testid="remote-video"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarFallback className="text-4xl bg-primary/20 text-primary">
                    {callerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold text-white mb-2">{callerName}</h2>
                <p className="text-gray-400">
                  {isConnecting ? (
                    activeCall.status === 'ringing' ? 'Ringing...' : 'Connecting...'
                  ) : isConnected ? (
                    formatDuration(activeCall.callDuration)
                  ) : (
                    'Call ended'
                  )}
                </p>
              </div>
            </div>
          )}
          
          {/* Local Video (Picture in Picture) */}
          {isVideoCall && localStream && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-64 rounded-lg overflow-hidden shadow-lg border-2 border-white/20"
              data-testid="local-video-pip"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
                data-testid="local-video"
              />
              {activeCall.isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </motion.div>
          )}
          
          {/* Call Status Badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-full">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm">{formatDuration(activeCall.callDuration)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm">
                    {activeCall.status === 'ringing' ? 'Ringing' : 'Connecting'}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Call Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <Button
                variant={activeCall.isMuted ? 'destructive' : 'secondary'}
                size="lg"
                className="h-14 w-14 rounded-full"
                onClick={toggleMute}
                data-testid="toggle-mute-btn"
              >
                {activeCall.isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              
              {/* Video Toggle (only for video calls) */}
              {isVideoCall && (
                <Button
                  variant={activeCall.isVideoOff ? 'destructive' : 'secondary'}
                  size="lg"
                  className="h-14 w-14 rounded-full"
                  onClick={toggleVideo}
                  data-testid="toggle-video-btn"
                >
                  {activeCall.isVideoOff ? (
                    <VideoOff className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </Button>
              )}
              
              {/* End Call Button */}
              <Button
                variant="destructive"
                size="lg"
                className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
                onClick={endCall}
                data-testid="end-call-btn"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface IncomingCallModalProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ callerName, callType, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        data-testid="incoming-call-modal"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        >
          {/* Caller Avatar with Pulse Animation */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mb-6"
          >
            <Avatar className="h-24 w-24 mx-auto ring-4 ring-primary/30">
              <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          {/* Caller Info */}
          <h2 className="text-xl font-semibold text-foreground mb-2">{callerName}</h2>
          <p className="text-muted-foreground mb-8">
            Incoming {callType === 'video' ? 'video' : 'voice'} call...
          </p>
          
          {/* Call Icon Animation */}
          <div className="flex justify-center mb-8">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 0.5 }}
            >
              {callType === 'video' ? (
                <Video className="h-8 w-8 text-primary" />
              ) : (
                <Phone className="h-8 w-8 text-primary" />
              )}
            </motion.div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700"
              onClick={onReject}
              data-testid="reject-call-btn"
            >
              <X className="h-8 w-8" />
            </Button>
            
            {/* Accept Button */}
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
              onClick={onAccept}
              data-testid="accept-call-btn"
            >
              {callType === 'video' ? (
                <Video className="h-8 w-8" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
