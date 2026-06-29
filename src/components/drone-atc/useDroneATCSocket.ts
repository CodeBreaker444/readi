'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TelemetryData {
  drone_id: string;
  name?: string;
  model?: string;
  tool_code?: string;
  pilot_name?: string;
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
  armed?: boolean;
  timestamp: number;
  company_id?: number;
  user_details?: {
    fullname?: string;
    email?: string;
    company_id?: number;
  };
  // Dock-specific fields
  attached_dock_id?: string | null;
  attached_drone_id?: string | null;
  binding_key?: string;
  dock_charging_status?: string;
  dock_drone_present?: boolean;
  dock_humidity?: number;
  dock_power_mode?: string;
  dock_rainfall?: number;
  dock_temperature?: number;
  dock_total_flights?: number;
  dock_wind_speed?: number;
  fix_state?: number;
  gps_quality?: number;
  gps_satellites?: number;
  land_height?: number;
  last_live_at?: number;
  rtk_satellites?: number;
  serial_no?: string;
}

export type DroneMap = Record<string, TelemetryData>;

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'no_flytbase_key';

function isDockDevice(item: Pick<TelemetryData, 'model' | 'device_type'>): boolean {
  return (
    item.model === 'Dock2v1' ||
    item.device_type === 'DockingStation' ||
    item.device_type === 'DOCK'
  );
}

interface UseDroneATCSocketReturn {
  drones: DroneMap;
  docks: DroneMap;
  userRole: string | null;
  status: ConnectionStatus;
  errorMessage: string | null;
  reconnect: () => void;
}

export function useDroneATCSocket(): UseDroneATCSocketReturn {
  const [drones, setDrones] = useState<DroneMap>({});
  const [docks, setDocks] = useState<DroneMap>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const credsRef = useRef<{ wsUrl: string; topic: string; token: string } | null>(null);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    setStatus('connecting');
    setErrorMessage(null);

    try {
      if (!credsRef.current) {
        const connectRes = await fetch('/api/drone-atc/connect', { method: 'POST' });
        if (!connectRes.ok) throw new Error(`Connect failed: ${connectRes.status}`);

        const connectData = await connectRes.json();
        if (!connectData.hasFlytbaseKey) {
          setStatus('no_flytbase_key');
          return;
        }

        const { wsUrl, topic, token } = connectData as { wsUrl: string; topic: string; token: string };
        if (!wsUrl || !token) {
          throw new Error(`FlytRelay returned incomplete connection data — wsUrl: ${wsUrl}, token present: ${!!token}`);
        }

        credsRef.current = { wsUrl, topic, token };

        const fleetRes = await fetch('/api/drone-atc/fleet');
        if (fleetRes.ok) {
          const fleetData = await fleetRes.json();
          console.log('fleet response:', fleetData);
          setUserRole(fleetData.role ?? null);

          const items: TelemetryData[] = fleetData.items ?? [];
          const droneMap: DroneMap = {};
          const dockMap: DroneMap = {};

          for (const item of items) {
            if (isDockDevice(item)) {
              dockMap[item.drone_id] = item;
            } else {
              droneMap[item.drone_id] = item;
            }
          }

          setDrones(droneMap);
          setDocks(dockMap);
        }
      }

      const { wsUrl, topic, token } = credsRef.current;
console.log('ws url:',wsUrl,'topic:',topic,'token present:',!!token);
      const socket = io(wsUrl, {
        path: '/socket.io/',
        transports: ['websocket'],
        reconnection: false,
        auth: { token },
      });

      console.log('socket created:', socket);

      socketRef.current = socket;

      socket.on('connect', () => {
        retryCountRef.current = 0;
        setStatus('connected');
        socket.emit('subscribe', { droneId: topic });
      });

      socket.on('telemetry', (payload: { droneId: string; data: TelemetryData; timestamp: number }) => {
        const incoming = payload.data ?? (payload as unknown as TelemetryData);
        console.log('tele:',incoming);

        const id = incoming.drone_id ?? payload.droneId;
        if (!id) return;

        const update = {
          ...incoming,
          drone_id: id,
          pilot_name: incoming.user_details?.fullname ?? incoming.pilot_name,
        };

        setDrones(prev => {
          if (id in prev) {
            const existing = prev[id];
            return { ...prev, [id]: { ...existing, ...update, pilot_name: existing.pilot_name ?? update.pilot_name } };
          }
          if (!isDockDevice(update)) return { ...prev, [id]: update };
          return prev;
        });

        setDocks(prev => {
          if (id in prev) {
            const existing = prev[id];
            return { ...prev, [id]: { ...existing, ...update, pilot_name: existing.pilot_name ?? update.pilot_name } };
          }
          if (isDockDevice(update)) return { ...prev, [id]: update };
          return prev;
        });
      });

      socket.on('disconnect', () => {
        setStatus('error');
        scheduleRetry();
      });

      socket.on('connect_error', (err) => {
        setStatus('error');
        setErrorMessage(err.message);
        socket.disconnect();
        scheduleRetry();
      });
    } catch (err) {
      credsRef.current = null;
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
      scheduleRetry();
    }
  }, []);

  function scheduleRetry() {
    if (retryRef.current !== null) return;
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
    credsRef.current = null; 
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setDrones({});
    setDocks({});
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { drones, docks, userRole, status, errorMessage, reconnect };
}
