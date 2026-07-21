"use client";

import { ModuleEmailNotificationConfig } from "@/components/settings/ModuleEmailNotificationConfig";
import { useTheme } from "@/components/useTheme";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAINTENANCE_EVENTS } from "@/config/types/email-notification";
import { Skeleton } from "@/components/ui/skeleton";

async function getOwnerData() {
  try {
    const response = await fetch('/api/user/owner-data');
    if (!response.ok) throw new Error('Failed to fetch owner data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching owner data:', error);
    return null;
  }
}

export default function SystemsEmailNotificationsPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [ownerData, setOwnerData] = useState<{ ownerId: number; emailEnabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnerData().then((data) => {
      if (data) {
        setOwnerData({
          ownerId: data.ownerId,
          emailEnabled: data.emailNotificationsEnabled || false,
        });
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
        <div
          className={`top-0 z-10 backdrop-blur-md transition-colors ${
            isDark
              ? "bg-slate-900/90 border-b border-slate-800"
              : "bg-white/90 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-6 py-3`}
        >
          <div className="mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Email Notifications
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Configure system email notifications
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 sm:h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ownerData) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
        <div
          className={`top-0 z-10 backdrop-blur-md transition-colors ${
            isDark
              ? "bg-slate-900/90 border-b border-slate-800"
              : "bg-white/90 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-6 py-3`}
        >
          <div className="mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Email Notifications
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Configure system email notifications
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className={`flex items-center justify-center p-8 rounded-xl border text-center ${isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
            <p>Unable to load user information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/90 border-b border-slate-800"
            : "bg-white/90 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-3`}
      >
        <div className="mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Email Notifications
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Configure system email notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div
            className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-4 rounded-xl border ${
              isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                {ownerData.emailEnabled ? "Email notifications enabled" : "Email notifications disabled"}
              </h3>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {ownerData.emailEnabled
                  ? "Company-level email notifications are enabled. You can configure specific system events below."
                  : "Company-level email notifications are disabled. Enable them in company settings to configure system-specific email notifications."}
              </p>
            </div>
            <span
              className={`self-start shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                ownerData.emailEnabled
                  ? isDark
                    ? "bg-green-500/10 text-green-400"
                    : "bg-green-50 text-green-600"
                  : isDark
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {ownerData.emailEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="w-full">
          <ModuleEmailNotificationConfig
            ownerId={ownerData.ownerId}
            moduleName="maintenance"
            companyEmailEnabled={ownerData.emailEnabled}
            events={MAINTENANCE_EVENTS}
          />
        </div>
      </main>
    </div>
  );
}