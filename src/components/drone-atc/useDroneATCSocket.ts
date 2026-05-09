'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TelemetryData {
  drone_id: string;
  name?: string;
  model?: string;
  device_type?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  velocity: number;
  battery_percentage: number;
  battery_voltage?: number;
  battery_temp?: number;
  signal_strength?: number;
  satellites?: number;
  hms_flags?: string[];
  status?: string;
  timestamp: number;
}

export type DroneMap = Record<string, TelemetryData>;

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'no_flytbase_key';

interface ConnectionEntry {
  wsUrl: string;
  topic: string;
  token: string;
}

interface UseDroneATCSocketReturn {
  drones: DroneMap;
  status: ConnectionStatus;
  errorMessage: string | null;
  reconnect: () => void;
}

export function useDroneATCSocket(): UseDroneATCSocketReturn {
  const [drones, setDrones] = useState<DroneMap>({});
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketsRef = useRef<Socket[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const connectedCountRef = useRef(0);

  const disconnectAll = useCallback(() => {
    socketsRef.current.forEach(s => s.disconnect());
    socketsRef.current = [];
    connectedCountRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    // Clean up any stale sockets before opening new ones
    if (socketsRef.current.some(s => s.connected)) return;
    socketsRef.current.forEach(s => s.disconnect());
    socketsRef.current = [];
    connectedCountRef.current = 0;

    setStatus('connecting');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/drone-atc/connect', { method: 'POST' });
      if (!res.ok) throw new Error(`Connect failed: ${res.status}`);

      const data = await res.json();

      if (!data.hasFlytbaseKey) {
        setStatus('no_flytbase_key');
        return;
      }

      const connections: ConnectionEntry[] = data.connections;

      connections.forEach(({ wsUrl, topic, token }) => {
        const socket = io(wsUrl, {
          path: '/socket.io/',
          transports: ['websocket'],
          reconnection: false,
          auth: { token },
        });

        socketsRef.current.push(socket);

        socket.on('connect', () => {
          connectedCountRef.current += 1;
          retryCountRef.current = 0;
          setStatus('connected');
          socket.emit('subscribe', { droneId: topic });
        });

        socket.on('telemetry', (payload: { droneId: string; data: TelemetryData; timestamp: number }) => {
          const telemetry = payload.data ?? (payload as unknown as TelemetryData);
          const id = telemetry.drone_id ?? payload.droneId;
          setDrones(prev => ({ ...prev, [id]: { ...telemetry, drone_id: id } }));
        });

        socket.on('disconnect', () => {
          connectedCountRef.current = Math.max(0, connectedCountRef.current - 1);
          if (connectedCountRef.current === 0) {
            setStatus('error');
            scheduleRetry();
          }
        });

        socket.on('connect_error', (err) => {
          connectedCountRef.current = Math.max(0, connectedCountRef.current - 1);
          setErrorMessage(err.message);
          socket.disconnect();
          if (connectedCountRef.current === 0) {
            setStatus('error');
            scheduleRetry();
          }
        });
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
      scheduleRetry();
    }
  }, []);

  function scheduleRetry() {
    if (retryRef.current !== null) return; // already scheduled
    if (retryCountRef.current >= 5) return;
    const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
    retryCountRef.current += 1;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      connect();
    }, delay);
  }

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    disconnectAll();
    setDrones({});
    connect();
  }, [connect, disconnectAll]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
      disconnectAll();
    };
  }, [connect, disconnectAll]);

  return { drones, status, errorMessage, reconnect };
}
