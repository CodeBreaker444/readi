'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { CheckCircle2, Globe, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/dcc/missions',
    trigger: 'PMVD creates a scheduled or on-demand mission',
    body: [
      { field: 'type',      type: 'string',  required: true,  description: '"SCHEDULED" or "ON-DEMAND"' },
      { field: 'missions',  type: 'array',   required: true,  description: 'Array of { missionId: string, startDateTime: ISO-UTC }' },
      { field: 'target',    type: 'string',  required: false, description: 'Human-readable mission target' },
      { field: 'localization', type: 'object', required: false, description: 'Highway / range / waypoint info' },
      { field: 'priority',  type: 'string',  required: false, description: 'Mission priority (e.g. HIGH)' },
      { field: 'notes',     type: 'string',  required: false, description: 'Free-text notes' },
      { field: 'operator',  type: 'string',  required: false, description: 'Operator identifier' },
    ],
    responses: [
      '200 — DCC saved all missions',
      '4xx/5xx — DCC rejected; PMVD will roll back created missions',
    ],
  },
  {
    method: 'POST',
    path: '/dcc/missions/cancel',
    trigger: 'PMVD cancels a scheduled program',
    body: [
      { field: 'missionIds', type: 'string[]', required: true, description: 'Complete list of mission IDs belonging to the cancelled program' },
    ],
    responses: [
      '200 — DCC cancelled the missions',
      '4xx — One or more IDs not found on DCC side',
    ],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/acceptance',
    trigger: 'OPM assigns request to a planning mission',
    body: [
      { field: 'droneId', type: 'uuid', required: true, description: 'Drone chosen for the mission' },
    ],
    responses: ['200 — Mission accepted (returns MissionEventDto[])', '400 — Missing droneId', '404 — Mission not found', '422 — Status does not allow acceptance'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/denial',
    trigger: 'OPM denies a flight request',
    body: [
      { field: 'note', type: 'string', required: false, description: 'Reason for denial' },
    ],
    responses: ['200 — Mission denied (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow denial'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/execution',
    trigger: 'Pilot moves mission to In Progress on the board',
    body: [],
    responses: ['200 — Mission started (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow execution'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/termination',
    trigger: 'Pilot moves mission to Done on the board',
    body: [
      { field: 'result', type: 'integer (1=success, 0=failure)', required: false, description: 'Flight result code' },
      { field: 'note', type: 'string', required: false, description: 'Final notes about mission result' },
    ],
    responses: ['200 — Mission terminated (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow termination'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/logging',
    trigger: 'OPM clicks Push Log on the Flight Requests page',
    body: [
      { field: 'uri', type: 'string', required: true, description: 'Remote logging source URI (FlytBase report URL)' },
    ],
    responses: ['201 — Log saved', '404 — Mission not found'],
  },
];

const METHOD_COLOR: Record<string, string> = {
  POST:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  PATCH: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  GET:   'bg-violet-500/10 text-violet-500 border-violet-500/30',
};

export default function DccIntegrationSettings() {
  const { isDark } = useTheme();
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [saved, setSaved]             = useState(false);

  const card  = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const input = isDark ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-500' : '';
  const label = isDark ? 'text-slate-400' : 'text-gray-500';
  const th    = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const td    = `px-4 py-3 text-xs align-top ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings/dcc');
      if (data.data) {
        setDisplayName(data.data.display_name);
        setCallbackUrl(data.data.callback_url);
      }
    } catch {
      toast.error('Failed to load DCC integration settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!displayName.trim() || !callbackUrl.trim()) {
      toast.error('Display name and URL are required');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/api/settings/dcc', { display_name: displayName.trim(), callback_url: callbackUrl.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('DCC integration saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="space-y-8">
      {/* Config card */}
      <div className={`rounded-xl border p-6 space-y-5 ${card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
            <Globe className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              DCC Server Configuration
            </h2>
            <p className={`text-xs ${label}`}>
              Readi will send mission status updates to this server
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className={`h-9 rounded-lg animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. AI View Group DCC"
                className={`h-9 text-xs ${input}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>Callback URL</Label>
              <Input
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="http://pmvd-controlcenter.example.com"
                className={`h-9 text-xs font-mono ${input}`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : saved
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-3.5 border-b ${isDark ? 'border-slate-700/60 bg-slate-800/60' : 'border-gray-100 bg-gray-50/80'}`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Status Endpoints
          </h2>
          <p className={`text-xs mt-0.5 ${label}`}>
            These paths are called on the DCC server when mission states change in Readi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700/40' : 'bg-gray-50/80'}>
              <tr>
                {['Method', 'Path', 'Triggered when', 'Request body', 'Responses'].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-100'}`}>
              {ENDPOINTS.map((ep) => (
                <tr key={ep.path} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/60'}>
                  <td className={td}>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${METHOD_COLOR[ep.method] ?? ''}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className={td}>
                    <code className={`text-[11px] break-all ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                      {ep.path}
                    </code>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {ep.trigger}
                  </td>
                  <td className={td}>
                    {ep.body.length === 0 ? (
                      <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>— none —</span>
                    ) : (
                      <div className="space-y-1.5">
                        {ep.body.map((f) => (
                          <div key={f.field} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <code className={`text-[11px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                {f.field}
                              </code>
                              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {f.type}
                              </span>
                              {f.required && (
                                <span className="text-[9px] font-bold text-red-500 uppercase">required</span>
                              )}
                            </div>
                            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {f.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <div className="space-y-0.5">
                      {ep.responses.map((r) => (
                        <div key={r} className={`text-[11px] ${
                          r.startsWith('2') ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                          : r.startsWith('4') ? isDark ? 'text-red-400' : 'text-red-500'
                          : isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {r}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
