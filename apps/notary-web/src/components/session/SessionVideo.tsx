'use client';

/**
 * SessionVideo — live video room for notarization sessions.
 * Wraps LiveKit: connects with a participant token, renders all
 * camera tracks in a brand-styled grid, and exposes mic/camera/leave controls.
 */
import { useMemo } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react';

interface SessionVideoProps {
  token: string;
  serverUrl: string;
  onLeave?: () => void;
  className?: string;
}

export function SessionVideo({ token, serverUrl, onLeave, className }: SessionVideoProps) {
  if (!token || !serverUrl) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <div className="text-center">
          <Video className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-400">Connecting to secure video session...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      onDisconnected={onLeave}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <RoomAudioRenderer />
      <VideoGrid />
      <Controls onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function VideoGrid() {
  const connectionState = useConnectionState();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  const gridCols = useMemo(() => {
    if (tracks.length <= 1) return 'grid-cols-1';
    if (tracks.length <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  }, [tracks.length]);

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-400">Joining video room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 grid ${gridCols} gap-2 p-2 pb-24`}>
      {tracks.map((trackRef) => {
        const name = trackRef.participant.name || trackRef.participant.identity;
        const hasVideo =
          'publication' in trackRef &&
          trackRef.publication &&
          !trackRef.publication.isMuted;
        return (
          <div
            key={trackRef.participant.identity + (('publication' in trackRef && trackRef.publication?.trackSid) || '')}
            className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10 min-h-0"
          >
            {hasVideo ? (
              <VideoTrack trackRef={trackRef as any} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white">
                    {(name || '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-400">Camera off</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {name}
              {trackRef.participant.isLocal ? ' (you)' : ''}
            </div>
          </div>
        );
      })}
      {tracks.length === 0 && (
        <div className="flex items-center justify-center">
          <p className="text-sm text-gray-400">Waiting for participants to join...</p>
        </div>
      )}
    </div>
  );
}

function Controls({ onLeave }: { onLeave?: () => void }) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();

  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
      <button
        aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-all ${
          isMicrophoneEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500'
        }`}
      >
        {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
      <button
        aria-label={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-all ${
          isCameraEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500'
        }`}
      >
        {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>
      <button
        aria-label="Leave session"
        onClick={onLeave}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-700"
      >
        <Phone className="h-5 w-5 rotate-[135deg]" />
      </button>
    </div>
  );
}
