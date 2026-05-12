'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { SessionUser } from '@/lib/auth/server-session';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineDocumentText, HiOutlinePaperAirplane } from 'react-icons/hi';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi2';

export default function ControlCenterPage({user}:{user: SessionUser}) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();

    const [hasToken, setHasToken] = useState<boolean | null>(null);
    const [tokenName, setTokenName] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
    const cardBase = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';

    const fetchData = useCallback(async () => {
        try {
            const tokenRes = await axios.get('/api/flytbase/token')

            setHasToken(tokenRes.data.hasToken ?? false);
            setTokenName(tokenRes.data.tokenName ?? null);
            setRole(user.role ?? null);
        } catch {
            setHasToken(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
    const loading = hasToken === null;

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bg}`}>
            <div className="animate-in fade-in duration-700 flex flex-col flex-1">
                <div
                    className={`backdrop-blur-md w-full ${isDark
                            ? 'bg-slate-900/80 border-b border-slate-800'
                            : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                        } px-4 sm:px-6 py-4`}
                >
                    <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full bg-violet-600" />
                            <div>
                                <h1 className={`font-semibold text-base tracking-tight ${textPrimary}`}>
                                    {t('sidebar.flytbase')}
                                </h1>
                                <p className={`text-xs ${textSecondary}`}>
                                    {t('flytbase.integration.subtitle')}
                                </p>
                            </div>
                        </div>

                        {hasToken && (
                            <Link href="/flytbase/flights">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 text-xs gap-1.5 ${isDark
                                            ? 'border-slate-700 bg-slate-800 text-slate-300'
                                            : 'border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <HiOutlineDocumentText className="w-3.5 h-3.5" />
                                    {t('flytbase.integration.viewFlights')}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
                    <div className="w-full max-w-md">
                        <div className={`rounded-xl border p-6 ${cardBase}`}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-lg bg-violet-600/10 flex items-center justify-center shrink-0">
                                    <HiOutlinePaperAirplane className="w-5 h-5 text-violet-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className={`text-sm font-semibold ${textPrimary}`}>{t('sidebar.flytbase')}</h2>
                                    <p className={`text-xs mt-0.5 ${textSecondary}`}>{t('flytbase.token.subtitle')}</p>
                                </div>
                                {loading ? (
                                    <Skeleton className={`h-5 w-20 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className={hasToken
                                            ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                                            : 'border-slate-500/40 text-slate-400 bg-slate-500/10'}
                                    >
                                        {hasToken ? t('flytbase.token.connected') : t('flytbase.token.notConnected')}
                                    </Badge>
                                )}
                            </div>

                            {loading && (
                                <Skeleton className={`h-14 w-full rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                            )}

                            {/* Connected — all roles */}
                            {!loading && hasToken && (
                                <div className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${isDark ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    }`}>
                                    <HiCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium">{t('flytbase.token.connected')}</p>
                                        {tokenName && (
                                            <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>{tokenName}</p>
                                        )}
                                        <p className={`text-xs mt-1 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                            {t('flytbase.token.savedNote')}
                                        </p>
                                        {isAdmin && (
                                            <button
                                                onClick={() => router.push('/profile')}
                                                className={`text-xs mt-2 underline underline-offset-2 ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-900'}`}
                                            >
                                                Edit in Profile →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Not connected — ADMIN: nudge to profile */}
                            {!loading && !hasToken && isAdmin && (
                                <div className={`rounded-lg border px-4 py-4 space-y-3 ${isDark ? 'bg-amber-950/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-start gap-2.5">
                                        <HiXCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                                        <div>
                                            <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                                                Control Center not configured
                                            </p>
                                            <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-amber-400/70' : 'text-amber-700/80'}`}>
                                                Add your API token, Organization ID, and name in your Profile to enable flight log imports.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => router.push('/profile')}
                                        className={`h-8 text-xs w-full ${isDark ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
                                            }`}
                                    >
                                        Set up in Profile →
                                    </Button>
                                </div>
                            )}

                            {/* Not connected — regular user: contact admin */}
                            {!loading && !hasToken && !isAdmin && (
                                <div className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}>
                                    <HiXCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <div>
                                        <p className="text-xs font-medium">{t('flytbase.token.notConnected')}</p>
                                        <p className={`text-xs mt-1 ${textSecondary}`}>{t('flytbase.integration.contactAdmin')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
