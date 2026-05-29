'use client';

import { useEffect, useRef, useState } from 'react';

interface StreamData {
  platform: string;
  url?: string;
  agora?: {
    appid: string;
    rtc_token: string;
    channelName?: string;
  };
  mediamtx?: {
    play_whep_url: string;
    play_token?: string;
  };
}

interface Props {
  data: StreamData;
  isDark: boolean;
}

function WhepPlayer({ whepUrl, playToken }: { whepUrl: string; playToken?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let pc: RTCPeerConnection | null = null;

    (async () => {
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (event.track.kind === 'video' && videoRef.current && !destroyed) {
            const stream = videoRef.current.srcObject instanceof MediaStream
              ? videoRef.current.srcObject
              : new MediaStream();
            stream.addTrack(event.track);
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => null);
            setStatus('live');
          }
          if (event.track.kind === 'audio' && videoRef.current) {
            const stream = videoRef.current.srcObject instanceof MediaStream
              ? videoRef.current.srcObject
              : new MediaStream();
            stream.addTrack(event.track);
            videoRef.current.srcObject = stream;
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const headers: Record<string, string> = { 'Content-Type': 'application/sdp' };
        if (playToken) headers['Authorization'] = `Bearer ${playToken}`;

        const resp = await fetch(whepUrl, {
          method: 'POST',
          headers,
          body: offer.sdp,
        });

        if (!resp.ok) throw new Error(`WHEP server returned ${resp.status}`);

        const answerSdp = await resp.text();
        if (destroyed) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (e) {
        if (!destroyed) {
          setErr(e instanceof Error ? e.message : 'WHEP connection failed');
          setStatus('error');
        }
      }
    })();

    return () => {
      destroyed = true;
      pc?.close();
    };
  }, [whepUrl, playToken]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted
      />
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-[11px] text-slate-400">Connecting to stream…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black px-4 text-center">
          <span className="text-[11px] text-red-400 font-medium">{err}</span>
        </div>
      )}
    </div>
  );
}

function AgoraPlayer({ appId, rtcToken, channel }: { appId: string; rtcToken: string; channel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'no-stream' | 'error'>('connecting');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!appId || !channel || !rtcToken || !containerRef.current) {
      setErr('Missing Agora credentials');
      setStatus('error');
      return;
    }

    let destroyed = false;
    let agoraClient: import('agora-rtc-sdk-ng').IAgoraRTCClient | null = null;

    const noStreamTimer = setTimeout(() => {
      if (!destroyed && status === 'connecting') setStatus('no-stream');
    }, 15000);

    (async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        if (destroyed) return;

        AgoraRTC.setLogLevel(4);
        agoraClient = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });

        agoraClient.on('user-published', async (user, mediaType) => {
          if (destroyed || !agoraClient) return;
          await agoraClient.subscribe(user, mediaType);
          if (mediaType === 'video' && containerRef.current) {
            user.videoTrack?.play(containerRef.current);
            clearTimeout(noStreamTimer);
            if (!destroyed) setStatus('live');
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        agoraClient.on('user-unpublished', (_user, mediaType) => {
          if (mediaType === 'video' && !destroyed) setStatus('no-stream');
        });

        await agoraClient.setClientRole('audience');
        await agoraClient.join(appId, channel, rtcToken, null);
      } catch (e) {
        clearTimeout(noStreamTimer);
        if (!destroyed) {
          setErr(e instanceof Error ? e.message : 'Agora connection failed');
          setStatus('error');
        }
      }
    })();

    return () => {
      destroyed = true;
      clearTimeout(noStreamTimer);
      agoraClient?.leave().catch(() => null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, channel, rtcToken]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-[11px] text-slate-400">Connecting to stream…</span>
        </div>
      )}
      {status === 'no-stream' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black px-4 text-center">
          <span className="text-[11px] text-slate-400">Waiting for drone to publish…</span>
          <span className="text-[10px] text-slate-600">{channel}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black px-4 text-center">
          <span className="text-[11px] text-red-400 font-medium">{err}</span>
        </div>
      )}
    </div>
  );
}

export default function VideoStreamPlayer({ data }: Props) {
  if (data.mediamtx?.play_whep_url) {
    return (
      <WhepPlayer
        whepUrl={data.mediamtx.play_whep_url}
        playToken={data.mediamtx.play_token}
      />
    );
  }

  const appId = data.agora?.appid ?? '';
  const rtcToken = data.agora?.rtc_token ?? '';
  const rawUrl = data.url ?? '';
  const params = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : rawUrl);
  const channel = data.agora?.channelName ?? params.get('channel') ?? '';

  return <AgoraPlayer appId={appId} rtcToken={rtcToken} channel={channel} />;
}
