/**
 * WebRTC Configuration
 * 
 * This file contains the configuration for WebRTC peer connections,
 * including STUN/TURN server settings for NAT traversal.
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

/**
 * Get WebRTC configuration with ICE servers
 * Uses public Google STUN servers for development
 * 
 * For production, add TURN servers for better NAT traversal:
 * - Twilio TURN servers
 * - Xirsys
 * - Or self-hosted coturn
 */
export function getWebRTCConfig(): WebRTCConfig {
  const iceServers: RTCIceServer[] = [
    // Public Google STUN servers (free, for development/basic usage)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Add TURN server if credentials are available (for production)
  // TURN servers are needed for users behind symmetric NATs
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

/**
 * Media constraints for getUserMedia
 */
export const mediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user',
  },
};

/**
 * Get media constraints based on call type
 */
export function getMediaConstraints(callType: 'audio' | 'video'): MediaStreamConstraints {
  if (callType === 'audio') {
    return {
      audio: mediaConstraints.audio,
      video: false,
    };
  }
  return {
    audio: mediaConstraints.audio,
    video: mediaConstraints.video,
  };
}

/**
 * Check if WebRTC is supported in the current browser
 */
export function isWebRTCSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof RTCPeerConnection !== 'undefined'
  );
}

/**
 * Check and request media permissions
 */
export async function checkMediaPermissions(callType: 'audio' | 'video'): Promise<{
  hasPermission: boolean;
  error?: string;
}> {
  try {
    const constraints = getMediaConstraints(callType);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Stop all tracks immediately after checking
    stream.getTracks().forEach(track => track.stop());
    
    return { hasPermission: true };
  } catch (error: any) {
    let errorMessage = 'Failed to access media devices';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Permission denied. Please allow access to your camera and microphone.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = callType === 'video' 
        ? 'No camera or microphone found on this device.'
        : 'No microphone found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'Your camera or microphone is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Could not satisfy media constraints. Try with different settings.';
    }
    
    return { hasPermission: false, error: errorMessage };
  }
}
