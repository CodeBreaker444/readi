'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { format } from 'date-fns';
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

interface ApiKey {
  api_key_id: number;
  key_name: string;
  key_prefix: string | null;
  key_scope: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="ml-1 text-slate-400 hover:text-violet-500 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ApiKeyManager() {
  const { isDark } = useTheme();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);  // shown only once after creation

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings/api-keys');
      setKeys(data.items);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newKeyName.trim()) { toast.error('Key name is required'); return; }
    setCreating(true);
    try {
      const { data } = await axios.post('/api/settings/api-keys', {
        key_name: newKeyName.trim(),
        expires_at: newExpiresAt || undefined,
      });
      setRevealedKey(data.key_value);
      setShowForm(false);
      setNewKeyName('');
      setNewExpiresAt('');
      await load();
      toast.success('API key created — copy it now, it will not be shown again.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      await axios.patch(`/api/settings/api-keys/${id}`);
      setKeys((prev) => prev.map((k) => k.api_key_id === id ? { ...k, is_active: false } : k));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke key');
    }
  }

  async function handleDelete(id: number) {
    try {
      await axios.delete(`/api/settings/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.api_key_id !== id));
      toast.success('API key deleted');
    } catch {
      toast.error('Failed to delete key');
    }
  }

  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const labelCls = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className={`h-5 w-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              API Keys
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Keys allow third-party services to submit flight mission requests.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white"
        >
          <Plus className="h-3.5 w-3.5" /> New Key
        </Button>
      </div>

      {revealedKey && (
        <div className={`rounded-xl border p-4 ${isDark ? 'bg-emerald-950/40 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            Your new API key — copy it now, it will not be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className={`flex-1 rounded px-3 py-2 text-xs font-mono break-all ${isDark ? 'bg-slate-900 text-emerald-300' : 'bg-white text-emerald-800 border border-emerald-200'}`}>
              {revealedKey}
            </code>
            <CopyButton value={revealedKey} />
            <button
              onClick={() => setRevealedKey(null)}
              className={`text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Use this key in the <code className="font-mono">X-API-KEY</code> header when calling <code className="font-mono">POST /api/missions</code>
          </p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
          <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>New API Key</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Key Name <span className="text-red-500">*</span></Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. External Flight App"
                className={`text-sm ${inputCls}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Expires At (optional)</Label>
              <Input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className={`text-sm ${inputCls}`}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8">
              {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Creating...</> : 'Create Key'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}
              className={`text-xs h-8 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        {loading ? (
          <table className="w-full text-xs">
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30 last:border-0">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : keys.length === 0 ? (
          <div className={`py-12 text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            No API keys yet. Create one to allow external services to submit missions.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className={isDark ? 'bg-slate-700/50' : 'bg-gray-50'}>
              <tr>
                {['Name', 'Key Prefix', 'Scope', 'Status', 'Last Used', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className={`px-4 py-2.5 text-left font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {keys.map((k) => (
                <tr key={k.api_key_id} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/80'}>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{k.key_name}</td>
                  <td className={`px-4 py-3 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {k.key_prefix ? <>{k.key_prefix}…</> : '—'}
                  </td>
                  <td className={`px-4 py-3 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{k.key_scope}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold
                      ${k.is_active
                        ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        : isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}`}>
                      {k.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {k.last_used_at ? format(new Date(k.last_used_at), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {k.expires_at ? format(new Date(k.expires_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {k.is_active && (
                        <button
                          onClick={() => handleRevoke(k.api_key_id)}
                          title="Revoke key"
                          className="p-1 rounded text-slate-400 hover:text-orange-500 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(k.api_key_id)}
                        title="Delete key"
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage note */}
      <div className={`rounded-lg border p-4 text-xs space-y-1.5 ${isDark ? 'bg-slate-800/60 border-slate-700/40 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>How to use</p>
        <p>Send flight mission requests to:</p>
        <code className={`block rounded px-2 py-1 font-mono text-[11px] ${isDark ? 'bg-slate-900 text-violet-300' : 'bg-white border border-gray-200 text-violet-700'}`}>
          POST /api/missions
        </code>
        <p>Include your key in the request header:</p>
        <code className={`block rounded px-2 py-1 font-mono text-[11px] ${isDark ? 'bg-slate-900 text-violet-300' : 'bg-white border border-gray-200 text-violet-700'}`}>
          X-API-KEY: your-key-here
        </code>
      </div>
    </div>
  );
}
