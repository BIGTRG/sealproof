'use client';

import { useState, useEffect } from 'react';
import { useSessionWizard } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import * as api from '@/lib/api';
import { Video, Mic, MicOff, VideoOff, Phone, Shield, FileCheck, Stamp } from 'lucide-react';

/**
 * Step 9 — Live Video Session
 * Customer-side view of the notarization session.
 * LiveKit video connects here; notary controls the workflow.
 */
export function StepLiveSession() {
  const { sessionId, nextStep } = useSessionWizard();
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [sessionStatus, setSessionStatus] = useState('in_progress');
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    // Get LiveKit token
    api.getLivekitToken(sessionId).then((res) => {
      if (res.data) {
        setToken(res.data.token);
        setRoomName(res.data.roomName);
      }
    });

    // Poll session status
    const interval = setInterval(async () => {
      const res = await api.getSession(sessionId);
      if (res.data?.session) {
        setSessionStatus(res.data.session.status);
        if (res.data.session.status === 'completed') {
          clearInterval(interval);
          nextStep();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, nextStep]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Session header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-navy-700">Live Session</span>
          <Badge variant="gold">{sessionStatus.replace(/_/g, ' ').toUpperCase()}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Encrypted and Recorded</span>
        </div>
      </div>

      {/* Video area */}
      <Card className="!p-0 overflow-hidden bg-navy-800 aspect-video relative">
        {/* In production, LiveKit video tracks mount here */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Video className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {token ? 'Connecting to video session...' : 'Waiting for video token...'}
            </p>
          </div>
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy-900/90 to-transparent p-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setAudioOn(!audioOn)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                audioOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'
              }`}
            >
              {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'
              }`}
            >
              {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all">
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </button>
          </div>
        </div>
      </Card>

      {/* Session progress */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[
          { icon: Shield, label: 'ID Verified', done: true },
          { icon: FileCheck, label: 'Documents Reviewed', done: sessionStatus !== 'in_progress' },
          { icon: FileCheck, label: 'Signatures Applied', done: ['sealing', 'completed'].includes(sessionStatus) },
          { icon: Stamp, label: 'Seal Applied', done: sessionStatus === 'completed' },
        ].map(({ icon: Icon, label, done }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
              done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Icon className="h-3 w-3" />
            </div>
            <span className={done ? 'text-navy-700 font-medium' : 'text-gray-400'}>{label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        The notary will guide you through each step. Please follow their instructions.
      </p>
    </div>
  );
}
